import { describe, expect, it, vi } from 'vitest';
import {
  createInitialDuelMatchState,
  getKillBountyGold,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { RaceId } from '../../../types/content-ids';
import type { BattlefieldRenderState } from '../runtime/battlefield/battlefieldRenderState';
import type { WaveRuntimeState } from '../runtime/wave/gameSceneWaveRuntime';
import { createGameSceneRuntimeWiring, type GameSceneWiringHost } from './gameSceneRuntimeWiring';

const STARTING_WALLET = 120;

function createHost(): GameSceneWiringHost & { duelState: () => DuelMatchState } {
  let duelMatchState = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
  const runState = { playerGold: STARTING_WALLET, playerLives: 20 } as WaveRuntimeState;
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
    expect(host.duelState().opponent.gold).toBe(opponentGoldBefore);
  });

  it('pays the computer the same bounty for a kill on its own battlefield', () => {
    const host = createHost();
    const opponentGoldBefore = host.duelState().opponent.gold;
    const wiring = createGameSceneRuntimeWiring(host);

    wiring.opponentBattlefieldContext.combatDeps.awardKillBounty();

    expect(host.duelState().opponent.gold).toBe(opponentGoldBefore + getKillBountyGold());
    expect(host.runState.playerGold).toBe(STARTING_WALLET);
  });
});
