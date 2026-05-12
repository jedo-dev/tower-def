import {
  addGold,
  applyEarlyWaveStartBonusPlaceholder,
  createInitialPlayerResources,
} from '../../../../../entities/player-resources';
import {
  completeWaveIfResolved,
  resetWavePhaseState,
  transitionCompletedToBuild,
  type WavePhaseState,
} from '../../../../../features/wave-phase';
import { calculateWaveStartPath, generateWaveUnits } from '../../../../../entities/wave';
import type { CreepEntity } from '../../../../../entities/creep';
import type { UnitConfig } from '../../../../../entities/unit';
import { ECONOMY_BALANCE } from '../../../../constants/economy';
import { CREEP_RENDER_DEPTH, CREEP_VISUAL_SIZE_PX } from '../../scenes/gameScene.constants';
import type { GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';
import type { CreepRenderState, PendingWaveSpawn } from '../../scenes/gameScene.types';

export type WaveRuntimeState = {
  activeCreepPath: GridPosition[];
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
  getSelectedFactionUnits: () => UnitConfig[];
  getSpriteKeyByUnit: (unit: UnitConfig) => string;
  getAnimationKeyByUnit: (unit: UnitConfig) => string;
  getCreepTypeFromUnit: (unit: UnitConfig) => 'basic';
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  onGoldUpdated: (nextGold: number) => void;
  onWavePhaseChanged: (nextPhase: WavePhaseState) => void;
  onBuildStateUpdated: () => void;
  onHudChanged: () => void;
  createCreepSprite: (x: number, y: number, spriteKey: string, animationKey: string) => Phaser.GameObjects.Sprite;
};

export function initializeWaveRuntime(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
  grid: GridModel,
): void {
  const waveStartPath = calculateWaveStartPath(grid);
  state.activeCreepPath = waveStartPath;
  state.activeCreeps.forEach((creep) => creep.sprite.destroy());
  state.activeCreeps = [];
  state.isWaveCompletionRewardGranted = false;

  const earlyBonusResult = applyEarlyWaveStartBonusPlaceholder(
    { gold: state.playerGold, lives: state.playerLives },
    ECONOMY_BALANCE.earlyWaveStartBonusGold,
    config.earlyWaveStartBonusPlaceholderEligible,
  );
  state.playerGold = earlyBonusResult.resources.gold;
  deps.onGoldUpdated(state.playerGold);

  if (waveStartPath.length === 0) {
    state.nextWaveStartsAtMs = null;
    deps.onHudChanged();
    return;
  }

  state.nextWaveStartsAtMs = deps.nowMs() + config.autoWaveStartDelayMs;
  deps.onBuildStateUpdated();
  deps.onHudChanged();
}

export function applyWaveCompletionRewardIfResolved(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
): void {
  if (state.isWaveCompletionRewardGranted) return;
  if (state.pendingWaveSpawns.length > 0) return;
  if (state.activeCreeps.length === 0) return;

  const hasAliveCreep = state.activeCreeps.some((creep) => creep.entity.status === 'alive');
  if (hasAliveCreep) return;

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

  state.isWaveCompletionRewardGranted = true;
  state.nextWaveStartsAtMs ??= deps.nowMs() + config.autoWaveStartDelayMs;
  deps.onBuildStateUpdated();
  deps.onHudChanged();
}

export function updateAutoWaveCountdown(state: WaveRuntimeState, nowMs: number, canBuild: boolean): boolean {
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
  state.activeCreepPath = [];
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

export function spawnWaveCreeps(
  state: WaveRuntimeState,
  config: WaveRuntimeConfig,
  deps: WaveRuntimeDependencies,
): void {
  state.activeCreeps.forEach((creep) => creep.sprite.destroy());
  state.activeCreeps = [];
  state.pendingWaveSpawns = [];

  const units = generateWaveUnits({
    waveNumber: state.currentWaveNumber,
    factionUnits: deps.getSelectedFactionUnits(),
  });

  const firstSpawnAtMs = deps.nowMs() + config.waveFirstSpawnDelayMs;
  state.pendingWaveSpawns = units.map((unit, index) => ({
    unit,
    sequenceIndex: index,
    spawnAtMs: firstSpawnAtMs + index * config.waveSpawnIntervalMs,
  }));
}

export function processPendingWaveSpawns(
  state: WaveRuntimeState,
  deps: WaveRuntimeDependencies,
  nowMs: number,
): void {
  if (state.pendingWaveSpawns.length === 0 || state.activeCreepPath.length === 0) return;

  const startPoint = deps.toCellCenter(state.activeCreepPath[0]);
  const readySpawns = state.pendingWaveSpawns.filter((spawn) => spawn.spawnAtMs <= nowMs);
  state.pendingWaveSpawns = state.pendingWaveSpawns.filter((spawn) => spawn.spawnAtMs > nowMs);

  for (const spawn of readySpawns) {
    const creepTypeFromUnit = deps.getCreepTypeFromUnit(spawn.unit);
    const waveCreep: CreepEntity = {
      id: `wave:creep:${state.currentWaveNumber}:${spawn.sequenceIndex}`,
      type: creepTypeFromUnit,
      hp: spawn.unit.health,
      lifeState: 'alive',
      speed: spawn.unit.speed,
      status: 'alive',
      position: { ...state.activeCreepPath[0] },
      pathIndex: 0,
    };

    const spriteKey = deps.getSpriteKeyByUnit(spawn.unit);
    const animationKey = deps.getAnimationKeyByUnit(spawn.unit);
    const sprite = deps.createCreepSprite(startPoint.x, startPoint.y, spriteKey, animationKey);
    sprite.setDisplaySize(CREEP_VISUAL_SIZE_PX, CREEP_VISUAL_SIZE_PX);
    sprite.setDepth(CREEP_RENDER_DEPTH);
    sprite.setTint(0xffffff);
    sprite.play(animationKey);

    state.activeCreeps.push({
      entity: waveCreep,
      sprite,
      hitFlashRemainingMs: 0,
      deathFadeRemainingMs: 0,
    });
  }
}
import type Phaser from 'phaser';
