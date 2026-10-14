import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createComputerDecisionDebugRecorder,
  createComputerMazePlanMemory,
  type LeakHistoryEntry,
} from '../../../../../entities/computer-opponent';
import { Difficulty } from '../../../../../entities/difficulty';
import {
  clearSendQueue,
  createInitialDuelMatchState,
  payIncome,
} from '../../../../../entities/duel-match';
import type { DuelMatchState } from '../../../../../entities/duel-match';
import { RaceId } from '../../../../types/content-ids';
import { findPathBfs } from '../../../pathfinding/hasPathBfs';
import { applyComputerBuildPhaseStrategies } from './gameSceneComputerStrategy';
import { onGameEvent } from '../../../game-bridge/bridge';
import type { GameEventMap } from '../../../game-bridge/types';
import { publishOpponentSendChanges } from './duelSideEvents';

function createDeps(difficulty: Difficulty, leakHistory: LeakHistoryEntry[] = []) {
  const registry = new Map<string, number | readonly unknown[]>();
  return {
    deps: {
      difficulty,
      leakHistory,
      mazePlanMemory: createComputerMazePlanMemory(),
      debugRecorder: createComputerDecisionDebugRecorder(),
      setRegistryValue: (key: string, value: number | readonly unknown[]) => {
        registry.set(key, value);
      },
    },
    registry,
  };
}

/**
 * Plays whole build phases: strategies, the income payout, then the wave
 * start that routes every queued send onto a field and empties the queues
 * (so the per-wave send limits apply per wave, as in a match).
 */
function playRounds(rounds: number, difficulty: Difficulty): DuelMatchState {
  let state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);
  // One match, one opponent memory: the maze plan carries across rounds.
  const { deps } = createDeps(difficulty);

  for (let round = 1; round <= rounds; round += 1) {
    state = { ...state, round, phase: 'build' };
    state = applyComputerBuildPhaseStrategies(state, deps);
    state = clearSendQueue(payIncome(state).state);
  }

  return state;
}

describe('shared/phaser/duel/applyComputerBuildPhaseStrategies', () => {
  it('does nothing outside the build phase', () => {
    const state = {
      ...createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC),
      phase: 'battle' as const,
    };

    expect(applyComputerBuildPhaseStrategies(state, createDeps(Difficulty.NORMAL).deps)).toBe(
      state,
    );
  });

  it('reports what the opponent did through the registry', () => {
    const state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);
    const { deps, registry } = createDeps(Difficulty.NORMAL);

    applyComputerBuildPhaseStrategies(state, deps);

    expect(registry.get('duel.opponent.builtCount')).toBeGreaterThan(0);
    expect(registry.get('duel.opponent.sendCount')).toBeGreaterThan(0);
  });

  it('grows the opponent income every round instead of letting it stall', () => {
    const start = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);

    const afterFive = playRounds(5, Difficulty.NORMAL);
    const afterFifteen = playRounds(15, Difficulty.NORMAL);

    // Building first would eat the gold a creep send needs, freezing income at
    // its starting value and starving the maze for the rest of the match.
    expect(afterFive.opponent.income).toBeGreaterThan(start.opponent.income);
    expect(afterFifteen.opponent.income).toBeGreaterThan(afterFive.opponent.income * 1.5);
  });

  it('spends the growing income on a longer and longer maze', () => {
    const openFieldLength = findPathBfs(
      createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC).opponent.battlefield.grid,
    ).path.length;

    const state = playRounds(20, Difficulty.NORMAL);
    const mazedLength = findPathBfs(state.opponent.battlefield.grid).path.length;

    expect(state.opponent.battlefield.towers.length).toBeGreaterThan(25);
    expect(mazedLength).toBeGreaterThan(openFieldLength * 3);
  });

  it('never leaves the opponent in debt', () => {
    const state = playRounds(20, Difficulty.HARD);

    expect(state.opponent.gold).toBeGreaterThanOrEqual(0);
  });

  it('leaves the player side of the match alone', () => {
    const start = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);

    const afterOneRound = applyComputerBuildPhaseStrategies(
      start,
      createDeps(Difficulty.HARD).deps,
    );

    expect(afterOneRound.player).toEqual(start.player);
    // Twenty rounds later the opponent has still never built on the other field.
    expect(playRounds(20, Difficulty.HARD).player.battlefield.towers).toHaveLength(0);
  });
});

describe('shared/phaser/duel computer send events (bridge integration)', () => {
  const unsubscribers: Array<() => void> = [];

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  });

  function listen<T extends 'send-queue-updated' | 'income-updated'>(event: T) {
    const handler = vi.fn<(payload: GameEventMap[T]) => void>();
    unsubscribers.push(onGameEvent(event, handler));
    return handler;
  }

  it('publishes an opponent-owned queue and income event when the computer sends', () => {
    const queueHandler = listen('send-queue-updated');
    const incomeHandler = listen('income-updated');
    const state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);

    const nextState = applyComputerBuildPhaseStrategies(state, createDeps(Difficulty.NORMAL).deps);

    expect(nextState.opponent.sendQueue.length).toBeGreaterThan(0);
    expect(queueHandler).toHaveBeenCalledTimes(1);
    expect(queueHandler).toHaveBeenCalledWith({
      owner: 'opponent',
      queue: nextState.opponent.sendQueue.map((creepTypeId, index) => ({ creepTypeId, index })),
    });
    expect(incomeHandler).toHaveBeenCalledTimes(1);
    expect(incomeHandler).toHaveBeenCalledWith({
      owner: 'opponent',
      income: nextState.opponent.income,
      delta: nextState.opponent.income - state.opponent.income,
    });
    expect(nextState.opponent.income).toBeGreaterThan(state.opponent.income);
  });

  it('publishes nothing for the player side and nothing outside the build phase', () => {
    const queueHandler = listen('send-queue-updated');
    const incomeHandler = listen('income-updated');
    const battleState = {
      ...createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC),
      phase: 'battle' as const,
    };

    applyComputerBuildPhaseStrategies(battleState, createDeps(Difficulty.NORMAL).deps);
    expect(queueHandler).not.toHaveBeenCalled();
    expect(incomeHandler).not.toHaveBeenCalled();

    applyComputerBuildPhaseStrategies(
      createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC),
      createDeps(Difficulty.NORMAL).deps,
    );

    const owners = [...queueHandler.mock.calls, ...incomeHandler.mock.calls].map(
      ([payload]) => payload.owner,
    );
    expect(owners.length).toBeGreaterThan(0);
    expect(owners.every((owner) => owner === 'opponent')).toBe(true);
  });

  it('stays silent when the computer changed neither its queue nor its income', () => {
    const queueHandler = listen('send-queue-updated');
    const incomeHandler = listen('income-updated');
    const state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);

    publishOpponentSendChanges(state, { ...state, opponent: { ...state.opponent } });

    expect(queueHandler).not.toHaveBeenCalled();
    expect(incomeHandler).not.toHaveBeenCalled();
  });
});
