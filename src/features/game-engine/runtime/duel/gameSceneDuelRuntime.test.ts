import { describe, expect, it, vi } from 'vitest';
import { createInitialDuelMatchState } from '../../../../entities/duel-match';
import { RaceId } from '../../../../shared/types/content-ids';
import type { DuelMatchRuntimeDeps, DuelMatchRuntimeState } from './gameSceneDuelRuntime';
import { applyDuelRoundEnd, publishRoundLifeEvents } from './gameSceneDuelRuntime';
import { onGameEvent } from '../../../../shared/lib/game-bridge/bridge';

function createRuntimeState(overrides?: Partial<DuelMatchRuntimeState>): DuelMatchRuntimeState {
  return {
    duelMatchState: createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC),
    wavePhaseState: { phase: 'wave' },
    isGameOver: false,
    nextWaveStartsAtMs: 10_000,
    ...overrides,
  };
}

function createDeps(): DuelMatchRuntimeDeps {
  return {
    onDuelMatchStateUpdated: vi.fn(),
    onGameOverUpdated: vi.fn(),
    onWavePhaseUpdated: vi.fn(),
    onBuildStateNeedsRefresh: vi.fn(),
    playGameOverSound: vi.fn(),
  };
}

describe('features/game-engine/runtime/duel/applyDuelRoundEnd', () => {
  it('pays the standing towers income on top of each side income', () => {
    const state = createRuntimeState();
    const before = state.duelMatchState;

    const result = applyDuelRoundEnd({
      state,
      deps: createDeps(),
      playerLeakedCreeps: 0,
      opponentLeakedCreeps: 0,
      towerIncome: { player: 6, opponent: 2 },
    });

    expect(result.playerIncomePaid).toBe(before.player.income + 6);
    expect(result.opponentIncomePaid).toBe(before.opponent.income + 2);
    expect(state.duelMatchState.opponent.gold).toBe(
      before.opponent.gold + before.opponent.income + 2,
    );
  });

  it('ends the runtime match when the player HP reaches zero', () => {
    const baseMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const state = createRuntimeState({
      duelMatchState: {
        ...baseMatchState,
        player: { ...baseMatchState.player, hp: 1 },
      },
    });
    const deps = createDeps();

    const result = applyDuelRoundEnd({
      state,
      deps,
      playerLeakedCreeps: 1,
      opponentLeakedCreeps: 0,
    });

    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(RaceId.ORC);
    expect(state.duelMatchState.player.hp).toBe(0);
    expect(state.isGameOver).toBe(true);
    expect(state.wavePhaseState.phase).toBe('game-over');
    expect(state.nextWaveStartsAtMs).toBeNull();
    expect(deps.onGameOverUpdated).toHaveBeenCalledWith(true);
  });

  it('ends the runtime match when the opponent HP reaches zero', () => {
    const baseMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const state = createRuntimeState({
      duelMatchState: {
        ...baseMatchState,
        opponent: { ...baseMatchState.opponent, hp: 1 },
      },
    });
    const deps = createDeps();

    const result = applyDuelRoundEnd({
      state,
      deps,
      playerLeakedCreeps: 0,
      opponentLeakedCreeps: 1,
    });

    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(RaceId.UNDEAD);
    expect(state.duelMatchState.opponent.hp).toBe(0);
    expect(state.isGameOver).toBe(true);
    expect(state.wavePhaseState.phase).toBe('game-over');
    expect(state.nextWaveStartsAtMs).toBeNull();
    expect(deps.onBuildStateNeedsRefresh).toHaveBeenCalledOnce();
  });

  it('keeps the runtime match active when both players still have HP', () => {
    const state = createRuntimeState();
    const deps = createDeps();

    const result = applyDuelRoundEnd({
      state,
      deps,
      playerLeakedCreeps: 1,
      opponentLeakedCreeps: 1,
    });

    expect(result.isMatchOver).toBe(false);
    expect(result.winner).toBeNull();
    expect(state.duelMatchState.player.hp).toBe(19);
    expect(state.duelMatchState.opponent.hp).toBe(19);
    expect(state.isGameOver).toBe(false);
    expect(state.wavePhaseState.phase).toBe('wave');
    expect(state.nextWaveStartsAtMs).toBe(10_000);
    expect(deps.onGameOverUpdated).not.toHaveBeenCalled();
  });

  it('pays income to both duelists when the round ends and the match continues', () => {
    const baseMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const state = createRuntimeState({
      duelMatchState: {
        ...baseMatchState,
        player: { ...baseMatchState.player, gold: 100, income: 25 },
        opponent: { ...baseMatchState.opponent, gold: 200, income: 40 },
      },
    });
    const deps = createDeps();

    const result = applyDuelRoundEnd({
      state,
      deps,
      playerLeakedCreeps: 0,
      opponentLeakedCreeps: 0,
    });

    expect(result.playerIncomePaid).toBe(25);
    expect(result.opponentIncomePaid).toBe(40);
    expect(state.duelMatchState.player.gold).toBe(125);
    expect(state.duelMatchState.opponent.gold).toBe(240);
    expect(deps.onDuelMatchStateUpdated).toHaveBeenCalledWith(state.duelMatchState);
  });

  it('does not pay income when the round end finishes the match', () => {
    const baseMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const state = createRuntimeState({
      duelMatchState: {
        ...baseMatchState,
        player: { ...baseMatchState.player, hp: 1, gold: 100, income: 25 },
        opponent: { ...baseMatchState.opponent, gold: 200, income: 40 },
      },
    });
    const deps = createDeps();

    const result = applyDuelRoundEnd({
      state,
      deps,
      playerLeakedCreeps: 1,
      opponentLeakedCreeps: 0,
    });

    expect(result.isMatchOver).toBe(true);
    expect(result.playerIncomePaid).toBe(0);
    expect(result.opponentIncomePaid).toBe(0);
    expect(state.duelMatchState.player.gold).toBe(100);
    expect(state.duelMatchState.opponent.gold).toBe(200);
  });

  it('steals lives for the sender and tells the HUD about both sides', () => {
    const state = createRuntimeState();
    const previousOpponentHp = state.duelMatchState.opponent.hp;
    const stolenHandler = vi.fn();
    const opponentHpHandler = vi.fn();
    const unsubscribeStolen = onGameEvent('lives-stolen', stolenHandler);
    const unsubscribeOpponentHp = onGameEvent('opponent-hp-updated', opponentHpHandler);

    const result = applyDuelRoundEnd({
      state,
      deps: createDeps(),
      playerLeakedCreeps: 2,
      opponentLeakedCreeps: 4,
      sentLeaks: { onPlayerField: 2, onOpponentField: 4 },
    });
    publishRoundLifeEvents(previousOpponentHp, result);
    unsubscribeStolen();
    unsubscribeOpponentHp();

    expect(state.duelMatchState.player.hp).toBe(20 - 2 + 2);
    expect(state.duelMatchState.opponent.hp).toBe(20 - 4 + 1);
    expect(stolenHandler).toHaveBeenCalledWith({ thief: 'player', lives: 2, hp: 20 });
    expect(stolenHandler).toHaveBeenCalledWith({ thief: 'opponent', lives: 1, hp: 17 });
    expect(opponentHpHandler).toHaveBeenCalledWith({ hp: 17, previousHp: 20, delta: -3 });
  });
});
