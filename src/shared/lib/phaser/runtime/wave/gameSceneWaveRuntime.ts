import type Phaser from 'phaser';
import {
  addGold,
  applyEarlyWaveStartBonusPlaceholder,
  createInitialPlayerResources,
} from '../../../../../entities/player-resources';
import {
  completeWaveIfResolved,
  createInitialWavePhaseState,
  isWavePhase,
  resetWavePhaseState,
  transitionCompletedToBuild,
  type WavePhaseState,
} from '../../../../../features/wave-phase';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import {
  calculateWaveRoutes,
  EMPTY_WAVE_ROUTES,
  hasWaveRoute,
  type WaveRoutes,
} from '../../../../../entities/wave';
import type { UnitConfig } from '../../../../../entities/unit';
import { ECONOMY_BALANCE } from '../../../../constants/economy';
import type { GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import type { SoundId } from '../../sound/audio.types';
import type { CreepRenderState, PendingWaveSpawn } from '../../scenes/gameScene.types';
import { destroyCreepRenderState } from '../combat/creepEffectVisuals';
import { scheduleWaveSpawns } from './waveSpawnCore';
import { isFieldWaveResolved, resolveWaveSpawnTiming } from './fieldWaveSpawns';

export type WaveRuntimeState = {
  activeCreepRoutes: WaveRoutes;
  activeCreeps: CreepRenderState[];
  pendingWaveSpawns: PendingWaveSpawn[];
  wavePhaseState: WavePhaseState;
  isWaveCompletionRewardGranted: boolean;
  nextWaveStartsAtMs: number | null;
  restartScheduledAtMs: number | null;
  playerGold: number;
  playerLives: number;
  isGameOver: boolean;
  currentWaveNumber: number;
  lastPublishedAutoStartSecondsLeft: number | null;
};

export type WaveRuntimeConfig = {
  autoWaveStartDelayMs: number;
  waveSpawnIntervalMs: number;
  waveFirstSpawnDelayMs: number;
  earlyWaveStartBonusPlaceholderEligible: boolean;
};

export type WaveRuntimeDependencies = {
  nowMs: () => number;
  getAdditionalWaveUnits: (waveNumber: number) => UnitConfig[];
  getSpriteKeyByUnit: (unit: UnitConfig) => string;
  getAnimationKeyByUnit: (unit: UnitConfig) => string;
  getCreepTypeFromUnit: (unit: UnitConfig) => 'basic';
  getCreepTintByUnit?: (unit: UnitConfig) => number;
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  onGoldUpdated: (nextGold: number) => void;
  onWavePhaseChanged: (nextPhase: WavePhaseState) => void;
  onBuildStateUpdated: () => void;
  onHudChanged: () => void;
  createCreepSprite: (
    x: number,
    y: number,
    spriteKey: string,
    animationKey: string,
  ) => Phaser.GameObjects.Sprite;
  playSound: (soundId: SoundId) => void;
};

/**
 * Creates the long-lived player run state owned by the scene. Wave and
 * movement runtime functions mutate it in place, so no per-call rebuilding or
 * copy-back is required. The creep list delegates to the battlefield render
 * state so both runtimes share a single source of truth.
 */
export function createPlayerWaveRuntimeState(
  battlefield: BattlefieldRenderState,
): WaveRuntimeState {
  const initialResources = createInitialPlayerResources();
  return {
    get activeCreeps() {
      return battlefield.creeps;
    },
    set activeCreeps(nextCreeps: CreepRenderState[]) {
      battlefield.creeps = nextCreeps;
    },
    activeCreepRoutes: EMPTY_WAVE_ROUTES,
    pendingWaveSpawns: [],
    wavePhaseState: createInitialWavePhaseState(),
    isWaveCompletionRewardGranted: false,
    nextWaveStartsAtMs: null,
    restartScheduledAtMs: null,
    playerGold: initialResources.gold,
    playerLives: initialResources.lives,
    isGameOver: false,
    currentWaveNumber: 1,
    lastPublishedAutoStartSecondsLeft: null,
  };
}

export function initializeWaveRuntime(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
  grid: GridModel,
): void {
  const waveRoutes = calculateWaveRoutes(grid);
  state.activeCreepRoutes = waveRoutes;
  state.activeCreeps.forEach((creep) => destroyCreepRenderState(creep));
  state.activeCreeps = [];
  state.isWaveCompletionRewardGranted = false;

  const earlyBonusResult = applyEarlyWaveStartBonusPlaceholder(
    { gold: state.playerGold, lives: state.playerLives },
    ECONOMY_BALANCE.earlyWaveStartBonusGold,
    config.earlyWaveStartBonusPlaceholderEligible,
  );
  state.playerGold = earlyBonusResult.resources.gold;
  deps.onGoldUpdated(state.playerGold);

  if (!hasWaveRoute(waveRoutes)) {
    state.nextWaveStartsAtMs = null;
    deps.onHudChanged();
    return;
  }

  state.nextWaveStartsAtMs = deps.nowMs() + config.autoWaveStartDelayMs;
  deps.onBuildStateUpdated();
  deps.onHudChanged();
}

/**
 * Ends the wave once both fields are resolved, so the computer's kills and
 * leaks are all in before the round is settled. The wave phase, not the creep
 * list, says a wave is running: the player's corpses may be cleared away
 * while the computer's field is still busy.
 */
export function applyWaveCompletionRewardIfResolved(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
  isOpponentFieldResolved: boolean,
): void {
  if (state.isWaveCompletionRewardGranted) return;
  if (!isWavePhase(state.wavePhaseState)) return;
  if (!isFieldWaveResolved(state) || !isOpponentFieldResolved) return;

  const nextPhase = completeWaveIfResolved(
    state.wavePhaseState,
    state.activeCreeps.map((creep) => creep.entity),
  );
  state.wavePhaseState = transitionCompletedToBuild(nextPhase);
  deps.onWavePhaseChanged(state.wavePhaseState);

  const nextResources = addGold(
    { gold: state.playerGold, lives: state.playerLives },
    ECONOMY_BALANCE.waveCompletionRewardGold,
  );
  state.playerGold = nextResources.gold;
  deps.onGoldUpdated(state.playerGold);
  deps.playSound('economy.wave_reward');
  deps.playSound('ui.wave_complete');

  state.isWaveCompletionRewardGranted = true;
  state.nextWaveStartsAtMs ??= deps.nowMs() + config.autoWaveStartDelayMs;
  deps.onBuildStateUpdated();
  deps.onHudChanged();
}

export function updateAutoWaveCountdown(
  state: WaveRuntimeState,
  nowMs: number,
  canBuild: boolean,
): boolean {
  if (!canBuild || state.nextWaveStartsAtMs === null) {
    if (state.lastPublishedAutoStartSecondsLeft !== null) {
      state.lastPublishedAutoStartSecondsLeft = null;
      return true;
    }
    return false;
  }

  const nextSecondsLeft = Math.max(0, Math.ceil((state.nextWaveStartsAtMs - nowMs) / 1000));
  if (state.lastPublishedAutoStartSecondsLeft === nextSecondsLeft) return false;

  state.lastPublishedAutoStartSecondsLeft = nextSecondsLeft;
  return true;
}

export function tryStartNextWave(state: WaveRuntimeState, nowMs: number): boolean {
  if (state.nextWaveStartsAtMs === null) return false;
  if (nowMs < state.nextWaveStartsAtMs) return false;
  return true;
}

export function tryRestartRun(state: WaveRuntimeState, nowMs: number): boolean {
  if (state.restartScheduledAtMs === null) return false;
  if (nowMs < state.restartScheduledAtMs) return false;
  state.restartScheduledAtMs = null;
  return true;
}

export function resetRunToInitialState(state: WaveRuntimeState): void {
  state.nextWaveStartsAtMs = null;
  state.activeCreepRoutes = EMPTY_WAVE_ROUTES;
  state.pendingWaveSpawns = [];
  state.isWaveCompletionRewardGranted = false;
  state.activeCreeps = [];

  const initialResources = createInitialPlayerResources();
  state.playerGold = initialResources.gold;
  state.playerLives = initialResources.lives;
  state.wavePhaseState = resetWavePhaseState();
  state.isGameOver = false;
  state.currentWaveNumber = 1;
  state.lastPublishedAutoStartSecondsLeft = null;
}

/**
 * Schedules the player's field for the wave: the round's shared baseline
 * (rolled once for both fields) followed by the computer's sends.
 */
export function spawnWaveCreeps(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
  baselineUnits: readonly UnitConfig[],
): void {
  state.activeCreeps.forEach((creep) => destroyCreepRenderState(creep));
  state.activeCreeps = [];
  state.pendingWaveSpawns = [];

  // Extra units on the player's field are the computer's sends.
  const additionalUnits = deps.getAdditionalWaveUnits(state.currentWaveNumber);

  state.pendingWaveSpawns = scheduleWaveSpawns(
    baselineUnits,
    additionalUnits,
    'opponent',
    resolveWaveSpawnTiming(deps.nowMs(), config),
  );
}
