import { describe, expect, it, vi } from 'vitest';
import { createInitialDuelMatchState } from '../../../../../entities/duel-match';
import { RaceId } from '../../../../types/content-ids';
import type { DuelMatchRuntimeDeps, DuelMatchRuntimeState } from './gameSceneDuelRuntime';
import { applyDuelRoundEnd } from './gameSceneDuelRuntime';

function createRuntimeState(overrides?: Partial<DuelMatchRuntimeState>): DuelMatchRuntimeState {
  return {
    duelMatchState: createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC),
    wavePhaseState: { phase: 'wave' },
    isGameOver: false,
    nextWaveStartsAtMs: 10_000,
    restartScheduledAtMs: 20_000,
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

describe('shared/lib/phaser/runtime/duel/applyDuelRoundEnd', () => {
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
});
