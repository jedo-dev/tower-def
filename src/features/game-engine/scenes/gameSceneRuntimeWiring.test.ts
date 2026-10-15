import { describe, expect, it, vi } from 'vitest';
import {
  createInitialDuelMatchState,
  getKillBountyGold,
  type DuelMatchState,
} from '../../../entities/duel-match';
import { RaceId } from '../../../shared/types/content-ids';
import type { BattlefieldRenderState } from '../runtime/battlefield/battlefieldRenderState';
import type { WaveRuntimeState } from '../runtime/wave/gameSceneWaveRuntime';
import { createGameSceneRuntimeWiring, type GameSceneWiringHost } from './gameSceneRuntimeWiring';

const STARTING_WALLET = 120;

function createHost(): GameSceneWiringHost & { duelState: () => DuelMatchState } {
  let duelMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
  const runState = { playerGold: STARTING_WALLET, waveKillBountyEarned: 0 } as WaveRuntimeState;
  const emptyField = { creeps: [], towers: [] } as unknown as BattlefieldRenderState;

  return {
    scene: { registry: { set: vi.fn() } } as unknown as GameSceneWiringHost['scene'],
    runState,
    playerField: emptyField,
    opponentField: emptyField,
    getSoundManager: () => null,
    soundRouter: { playTowerSound: vi.fn(), playCreepSound: vi.fn() },
    getDuelMatchState: () => duelMatchState,
    setDuelMatchState: (state) => {
      duelMatchState = state;
    },
    getComputerSendWaveUnits: () => [],
    gameNowMs: () => 0,
    refreshBuildState: vi.fn(),
    publishHudSnapshot: vi.fn(),
    handleGameOverUpdated: vi.fn(),
    syncOpponentDuelCreepsFromField: vi.fn(),
    duelState: () => duelMatchState,
  };
}

describe('kill bounty wiring', () => {
  it('pays the player for a kill on the player battlefield', () => {
    const host = createHost();
    const opponentGoldBefore = host.duelState().opponent.gold;
    const wiring = createGameSceneRuntimeWiring(host);

    wiring.playerBattlefieldContext.combatDeps.awardKillBounty();

    expect(host.runState.playerGold).toBe(STARTING_WALLET + getKillBountyGold());
    expect(host.runState.waveKillBountyEarned).toBe(getKillBountyGold());
    expect(host.duelState().opponent.gold).toBe(opponentGoldBefore);
  });

  it('pays the computer the same bounty for a kill on its own battlefield', () => {
    const host = createHost();
    const opponentGoldBefore = host.duelState().opponent.gold;
    const wiring = createGameSceneRuntimeWiring(host);

    wiring.opponentBattlefieldContext.combatDeps.awardKillBounty();

    expect(host.duelState().opponent.gold).toBe(opponentGoldBefore + getKillBountyGold());
    expect(host.runState.playerGold).toBe(STARTING_WALLET);
    expect(host.runState.waveKillBountyEarned).toBe(0);
  });
});

describe('life counter wiring', () => {
  it('drives the registry lives from the duel state HP when a round settles', () => {
    const host = createHost();
    const wiring = createGameSceneRuntimeWiring(host);
    const settled = host.duelState();
    const nextState: DuelMatchState = {
      ...settled,
      player: { ...settled.player, hp: settled.player.hp - 3 },
    };

    wiring.duelMatchRuntimeDeps.onDuelMatchStateUpdated(nextState);

    expect(host.duelState().player.hp).toBe(settled.player.hp - 3);
    expect(host.scene.registry.set).toHaveBeenCalledWith('economy.lives', settled.player.hp - 3);
  });

  it('keeps no second life counter on the player run state', () => {
    const host = createHost();
    const wiring = createGameSceneRuntimeWiring(host);

    wiring.playerBattlefieldContext.movementDeps.onEscapedCountUpdated(1);

    expect(host.runState).not.toHaveProperty('playerLives');
    expect(host.scene.registry.set).not.toHaveBeenCalledWith('economy.lives', expect.anything());
  });
});
