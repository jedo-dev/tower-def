import { describe, expect, it, vi } from 'vitest';
import {
  createInitialWavePhaseState,
  startNextWaveCycle,
  type WavePhaseState,
} from '../../../wave-phase';
import { ECONOMY_BALANCE } from '../../../../shared/constants/economy';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  applyWaveCompletionRewardIfResolved,
  type WaveRuntimeConfig,
  type WaveRuntimeDependencies,
  type WaveRuntimeState,
} from './gameSceneWaveRuntime';

const STARTING_GOLD = 100;
const CONFIG: WaveRuntimeConfig = {
  autoWaveStartDelayMs: 30_000,
  waveSpawnIntervalMs: 500,
  waveFirstSpawnDelayMs: 250,
  earlyWaveStartBonusPlaceholderEligible: false,
};

function creep(status: CreepRenderState['entity']['status']): CreepRenderState {
  return { entity: { status } } as CreepRenderState;
}

function createState(
  activeCreeps: CreepRenderState[],
  wavePhaseState: WavePhaseState = startNextWaveCycle(createInitialWavePhaseState()),
): WaveRuntimeState {
  return {
    activeCreepRoutes: { small: [], large: [], air: [] },
    activeCreeps,
    pendingWaveSpawns: [],
    wavePhaseState,
    isWaveCompletionRewardGranted: false,
    nextWaveStartsAtMs: null,
    playerGold: STARTING_GOLD,
    isGameOver: false,
    currentWaveNumber: 2,
    lastPublishedAutoStartSecondsLeft: null,
  };
}

function createDeps(): WaveRuntimeDependencies {
  return {
    nowMs: () => 0,
    onGoldUpdated: vi.fn(),
    onWavePhaseChanged: vi.fn(),
    onBuildStateUpdated: vi.fn(),
    onHudChanged: vi.fn(),
    playSound: vi.fn(),
  } as unknown as WaveRuntimeDependencies;
}

describe('wave end waits for both battlefields', () => {
  it('keeps the wave running while the computer field still has creeps', () => {
    const state = createState([creep('dead'), creep('escaped')]);

    applyWaveCompletionRewardIfResolved(state, CONFIG, createDeps(), false);

    expect(state.isWaveCompletionRewardGranted).toBe(false);
    expect(state.wavePhaseState.phase).toBe('wave');
    expect(state.playerGold).toBe(STARTING_GOLD);
  });

  it('keeps the wave running while the player field still has a walking creep', () => {
    const state = createState([creep('alive')]);

    applyWaveCompletionRewardIfResolved(state, CONFIG, createDeps(), true);

    expect(state.isWaveCompletionRewardGranted).toBe(false);
  });

  it('ends the wave once both fields are resolved', () => {
    const state = createState([creep('dead'), creep('escaped')]);

    applyWaveCompletionRewardIfResolved(state, CONFIG, createDeps(), true);

    expect(state.isWaveCompletionRewardGranted).toBe(true);
    expect(state.wavePhaseState.phase).toBe('build');
    expect(state.playerGold).toBe(STARTING_GOLD + ECONOMY_BALANCE.waveCompletionRewardGold);
  });

  it("ends the wave after the player's corpses were cleared while the computer finished", () => {
    const state = createState([]);

    applyWaveCompletionRewardIfResolved(state, CONFIG, createDeps(), true);

    expect(state.isWaveCompletionRewardGranted).toBe(true);
  });

  it('does nothing in the build phase before any wave ran', () => {
    const state = createState([], createInitialWavePhaseState());

    applyWaveCompletionRewardIfResolved(state, CONFIG, createDeps(), true);

    expect(state.isWaveCompletionRewardGranted).toBe(false);
    expect(state.playerGold).toBe(STARTING_GOLD);
  });
});
