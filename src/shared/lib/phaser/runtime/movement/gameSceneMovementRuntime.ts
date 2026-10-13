import { getEffectiveSpeedMultiplier } from '../../../../../entities/creep';
import { syncCreepEffectPipPosition } from '../combat/creepEffectVisuals';
import { applyCreepFacing } from '../animation/creepFacing';
import { isGameOverByLives, subtractLives } from '../../../../../entities/player-resources';
import { transitionToGameOver, type WavePhaseState } from '../../../../../features/wave-phase';
import type { GridPosition } from '../../../../types/pathfinding';
import {
  hasWaveRoute,
  selectWaveRoute,
  type WaveRoute,
  type WaveRoutes,
} from '../../../pathfinding/waveRoutes';
import type { SoundId } from '../../sound/audio.types';
import type { CreepRenderState } from '../../scenes/gameScene.types';

export type MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: number;
  creepBaseMoveSpeedPxPerSec: number;
  restartDelayMs: number;
};

export type MovementRuntimeState = {
  activeCreeps: CreepRenderState[];
  activeCreepRoutes: WaveRoutes;
  playerGold: number;
  playerLives: number;
  isGameOver: boolean;
  restartScheduledAtMs: number | null;
  wavePhaseState: WavePhaseState;
};

/** A point the movement runtime writes into instead of allocating a new one. */
export type MutablePoint = { x: number; y: number };

export type MovementRuntimeDeps = {
  nowMs: () => number;
  /** Writes the pixel centre of `position`'s cell into `out`. */
  writeCellCenter: (position: GridPosition, out: MutablePoint) => void;
  onLivesUpdated: (lives: number) => void;
  onGameOverUpdated: (isGameOver: boolean) => void;
  shouldEndRunOnLivesDepleted: () => boolean;
  onWavePhaseUpdated: (nextWavePhase: WavePhaseState) => void;
  onEscapedCountUpdated: (escapedCount: number) => void;
  onBuildStateNeedsRefresh: () => void;
  onHudChanged: () => void;
  playSound: (soundId: SoundId) => void;
};

function markCreepEscaped(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  config: MovementRuntimeConfig,
  creep: CreepRenderState,
): void {
  if (creep.entity.status === 'escaped') {
    return;
  }

  creep.entity.status = 'escaped';
  deps.playSound('combat.creep_escape');
  deps.playSound('economy.life_lost');
  const nextResources = subtractLives({ gold: state.playerGold, lives: state.playerLives }, 1);
  state.playerLives = nextResources.lives;
  deps.onLivesUpdated(state.playerLives);

  if (isGameOverByLives({ lives: state.playerLives }) && deps.shouldEndRunOnLivesDepleted()) {
    state.isGameOver = true;
    state.wavePhaseState = transitionToGameOver(state.wavePhaseState);
    state.restartScheduledAtMs ??= deps.nowMs() + config.restartDelayMs;
    deps.onWavePhaseUpdated(state.wavePhaseState);
    deps.onGameOverUpdated(state.isGameOver);
    deps.onBuildStateNeedsRefresh();
    deps.playSound('ui.game_over');
  }

  deps.onHudChanged();

  const escapedCount = state.activeCreeps.filter(
    (candidate) => candidate.entity.status === 'escaped',
  ).length;
  deps.onEscapedCountUpdated(escapedCount);
}

/** Scratch waypoint reused for every creep and frame, so movement never allocates per frame. */
const waypointPx: MutablePoint = { x: 0, y: 0 };

/**
 * Turns the creep to face the route segment it is on. The heading comes from
 * the integer route step rather than the sprite position, so a diagonal stays
 * one stable direction instead of flickering on floating point noise.
 */
function faceCurrentSegment(creep: CreepRenderState, route: WaveRoute): void {
  const index = creep.entity.pathIndex;
  const fromIndex = index + 1 < route.length ? index : index - 1;
  if (fromIndex < 0) {
    return;
  }

  const from = route[fromIndex];
  const to = route[fromIndex + 1];
  applyCreepFacing(creep, to.x - from.x, to.y - from.y);
}

/**
 * Advances one creep `distancePx` along its route. Distance left over after a
 * waypoint carries into the next segment, so a diagonal step (sqrt 2 cells
 * long) takes sqrt 2 times as long as an orthogonal one at the same speed.
 * Returns true when the creep reached the last waypoint.
 */
function advanceAlongRoute(
  creep: CreepRenderState,
  route: WaveRoute,
  deps: MovementRuntimeDeps,
  distancePx: number,
): boolean {
  const footprintCenterOffsetPx = creep.footprintCenterOffsetPx ?? 0;
  let remainingPx = distancePx;
  let x = creep.sprite.x;
  let y = creep.sprite.y;
  let hasReachedExit = false;

  while (remainingPx > 0) {
    const nextPathIndex = creep.entity.pathIndex + 1;
    const nextPoint = route[nextPathIndex];
    deps.writeCellCenter(nextPoint, waypointPx);
    const dx = waypointPx.x + footprintCenterOffsetPx - x;
    const dy = waypointPx.y + footprintCenterOffsetPx - y;
    const distanceToNext = Math.hypot(dx, dy);

    if (distanceToNext > remainingPx) {
      const ratio = remainingPx / distanceToNext;
      x += dx * ratio;
      y += dy * ratio;
      break;
    }

    x += dx;
    y += dy;
    remainingPx -= distanceToNext;
    creep.entity.pathIndex = nextPathIndex;
    creep.entity.position = { x: nextPoint.x, y: nextPoint.y };

    if (nextPathIndex >= route.length - 1) {
      hasReachedExit = true;
      break;
    }
  }

  creep.sprite.setPosition(x, y);
  syncCreepEffectPipPosition(creep);
  faceCurrentSegment(creep, route);
  return hasReachedExit;
}

/**
 * Moves every alive creep along the wave route for its size class. A creep
 * stands on its footprint centre: the anchor cell centre plus the render
 * state's footprint offset (non-zero only for large creeps).
 */
export function moveCreepsAlongPath(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  config: MovementRuntimeConfig,
  deltaMs: number,
): void {
  if (!hasWaveRoute(state.activeCreepRoutes) || state.activeCreeps.length === 0) {
    return;
  }

  const normalizedDeltaMs = Math.min(deltaMs, config.creepMaxSimulationDeltaMs);

  for (const creep of state.activeCreeps) {
    if (creep.entity.status !== 'alive') {
      continue;
    }

    const route = selectWaveRoute(state.activeCreepRoutes, creep.entity.sizeClass);

    // A stunned creep holds its ground but must still be able to leak once it
    // is already standing on the exit, so movement stops after the escape check.
    if (creep.entity.pathIndex + 1 >= route.length) {
      markCreepEscaped(state, deps, config, creep);
      continue;
    }

    const stepDistancePx =
      (normalizedDeltaMs / 1000) *
      config.creepBaseMoveSpeedPxPerSec *
      creep.entity.speed *
      getEffectiveSpeedMultiplier(creep.entity);

    if (stepDistancePx <= 0) {
      continue;
    }

    if (advanceAlongRoute(creep, route, deps, stepDistancePx)) {
      markCreepEscaped(state, deps, config, creep);
    }
  }
}
