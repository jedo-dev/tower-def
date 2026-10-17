import type Phaser from 'phaser';
import type { UnitConfig } from '../../../../entities/unit';
import type { CreepType } from '../../../../entities/creep';
import {
  EMPTY_WAVE_ROUTES,
  hasWaveRoute,
  selectWaveRoute,
  type WaveRoutes,
} from '../../../../shared/lib/pathfinding/waveRoutes';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { CREEP_RENDER_DEPTH } from '../../scenes/gameScene.constants';
import type { CreepRenderState, PendingWaveSpawn } from '../../scenes/gameScene.types';
import { isDirectionalCreepSprite } from '../animation/creepFacing';
import { getCreepVisualMetrics } from '../creep/creepVisualMetrics';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import { destroyCreepRenderState } from '../combat/creepEffectVisuals';
import {
  createWaveCreepEntity,
  hasReadyWaveSpawn,
  scheduleWaveSpawns,
  takeReadyWaveSpawns,
  type WaveSpawnTiming,
} from './waveSpawnCore';

// Spawning on a battlefield during a wave, the same for both fields: the
// player's run state and the computer's field each hold a spawn schedule that
// releases one creep per interval.

/** What spawning needs from a field. */
export type FieldSpawnState = {
  activeCreeps: CreepRenderState[];
  activeCreepRoutes: WaveRoutes;
  pendingWaveSpawns: PendingWaveSpawn[];
  currentWaveNumber: number;
};

export type FieldSpawnDeps = {
  getSpriteKeyByUnit: (unit: UnitConfig) => string;
  getAnimationKeyByUnit: (unit: UnitConfig) => string;
  getCreepTypeFromUnit: (unit: UnitConfig) => CreepType;
  getCreepTintByUnit?: (unit: UnitConfig) => number;
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  createCreepSprite: (
    x: number,
    y: number,
    spriteKey: string,
    animationKey: string,
  ) => Phaser.GameObjects.Sprite;
  /** Adds the shadow, sender ring and health bar to a spawned creep. */
  attachCreepAdornments?: (creep: CreepRenderState) => void;
};

export type WaveSpawnCadence = {
  waveFirstSpawnDelayMs: number;
  waveSpawnIntervalMs: number;
};

/** The spawn timing of a wave starting at `nowMs`; both fields use it. */
export function resolveWaveSpawnTiming(nowMs: number, cadence: WaveSpawnCadence): WaveSpawnTiming {
  return {
    firstSpawnAtMs: nowMs + cadence.waveFirstSpawnDelayMs,
    spawnIntervalMs: cadence.waveSpawnIntervalMs,
  };
}

/** The field's wave is over: everything spawned and nothing is still walking. */
export function isFieldWaveResolved(
  state: Pick<FieldSpawnState, 'activeCreeps' | 'pendingWaveSpawns'>,
): boolean {
  return (
    state.pendingWaveSpawns.length === 0 &&
    state.activeCreeps.every((creep) => creep.entity.status !== 'alive')
  );
}

/** The computer field's spawn state; its creep list is the field's own. */
export function createOpponentFieldWaveState(field: BattlefieldRenderState): FieldSpawnState {
  return {
    get activeCreeps() {
      return field.creeps;
    },
    set activeCreeps(nextCreeps: CreepRenderState[]) {
      field.creeps = nextCreeps;
    },
    activeCreepRoutes: EMPTY_WAVE_ROUTES,
    pendingWaveSpawns: [],
    currentWaveNumber: 1,
  };
}

export type OpponentFieldWaveInput = {
  routes: WaveRoutes;
  waveNumber: number;
  /** The round's shared baseline, the same units the player's field gets. */
  baselineUnits: readonly UnitConfig[];
  /** The player's sends for this round. */
  sentUnits: readonly UnitConfig[];
  timing: WaveSpawnTiming;
};

/**
 * Schedules the computer's field for the wave: the shared baseline, then the
 * player's sends, released on the same timing as the player's field. A field
 * with no route gets nothing scheduled: creeps that can never spawn would
 * keep the wave, which waits for both fields, from ever ending.
 */
export function scheduleOpponentFieldWave(
  state: FieldSpawnState,
  input: OpponentFieldWaveInput,
): void {
  state.activeCreeps.forEach((creep) => destroyCreepRenderState(creep));
  state.activeCreeps = [];
  state.activeCreepRoutes = input.routes;
  state.currentWaveNumber = input.waveNumber;
  if (!hasWaveRoute(input.routes)) {
    state.pendingWaveSpawns = [];
    return;
  }
  state.pendingWaveSpawns = scheduleWaveSpawns(
    input.baselineUnits,
    input.sentUnits,
    'player',
    input.timing,
  );
}

/** Drops whatever is still scheduled; the creeps belong to the field's render state. */
export function clearFieldWaveSchedule(state: FieldSpawnState): void {
  state.pendingWaveSpawns = [];
}

export function processPendingWaveSpawns(
  state: FieldSpawnState,
  deps: FieldSpawnDeps,
  nowMs: number,
): void {
  if (state.pendingWaveSpawns.length === 0 || !hasWaveRoute(state.activeCreepRoutes)) return;
  // Between spawns the schedule stays as is: no per-frame copy of it.
  if (!hasReadyWaveSpawn(state.pendingWaveSpawns, nowMs)) return;

  const { ready, pending } = takeReadyWaveSpawns(state.pendingWaveSpawns, nowMs);
  state.pendingWaveSpawns = pending;

  for (const spawn of ready) {
    state.activeCreeps.push(createSpawnedCreep(state, deps, spawn));
  }
}

function createSpawnedCreep(
  state: FieldSpawnState,
  deps: FieldSpawnDeps,
  spawn: PendingWaveSpawn,
): CreepRenderState {
  const route = selectWaveRoute(state.activeCreepRoutes, spawn.unit);
  const startPoint = deps.toCellCenter(route[0]);
  const waveCreep = createWaveCreepEntity(
    spawn,
    state.currentWaveNumber,
    route,
    deps.getCreepTypeFromUnit(spawn.unit),
  );

  const spriteKey = deps.getSpriteKeyByUnit(spawn.unit);
  const animationKey = deps.getAnimationKeyByUnit(spawn.unit);
  const visualMetrics = getCreepVisualMetrics(spawn.unit.sizeClass);
  const footprintCenterOffsetPx = visualMetrics.footprintCenterOffsetPx;
  const sprite = deps.createCreepSprite(
    startPoint.x + footprintCenterOffsetPx,
    startPoint.y + footprintCenterOffsetPx,
    spriteKey,
    animationKey,
  );
  sprite.setDisplaySize(visualMetrics.displaySizePx, visualMetrics.displaySizePx);
  sprite.setDepth(CREEP_RENDER_DEPTH);
  const baseTint = deps.getCreepTintByUnit?.(spawn.unit) ?? 0xffffff;
  sprite.setTint(baseTint);
  sprite.play(animationKey);

  // The sheet decides what the creep can do: four rows mean it can turn and die
  // on screen, a legacy strip keeps the rotate-and-fade behaviour.
  const isDirectional = isDirectionalCreepSprite(sprite);

  const creep: CreepRenderState = {
    entity: waveCreep,
    sprite,
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
    footprintCenterOffsetPx,
    baseTint,
    unitId: spawn.unit.id,
    race: spawn.unit.faction,
    isDirectional,
    facing: isDirectional ? 'side' : undefined,
    facingFlipped: false,
  };
  deps.attachCreepAdornments?.(creep);
  return creep;
}
