import { syncCreepEffectPipPosition } from '../combat/creepEffectVisuals';
import { applyCreepFacing } from '../animation/creepFacing';
import { syncCreepRenderDepth } from '../battlefield/actorRenderDepth';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import {
  hasWaveRoute,
  type WaveRoute,
  type WaveRoutes,
} from '../../../../shared/lib/pathfinding/waveRoutes';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import { CreepSoundSlot } from '../../../../shared/types/sound-ids';
import type { GameSoundRouter } from '../audio/gameSoundRouting';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { walkCreepsAlongRoutes, type MutablePoint, type RouteWalkMotion } from './routeWalk';

export type MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: number;
  creepBaseMoveSpeedPxPerSec: number;
};

export type MovementRuntimeState = {
  activeCreeps: CreepRenderState[];
  activeCreepRoutes: WaveRoutes;
};

export type { MutablePoint };

export type MovementRuntimeDeps = {
  /** Writes the pixel centre of `position`'s cell into `out`. */
  writeCellCenter: (position: GridPosition, out: MutablePoint) => void;
  onEscapedCountUpdated: (escapedCount: number) => void;
  onHudChanged: () => void;
  playSound: (soundId: SoundId) => void;
  /** Creature sounds, resolved through the creature's race sound profile. */
  soundRouter: GameSoundRouter;
};

/**
 * Marks a creep that reached the exit. A leak costs no life here: the duel
 * state's HP is the only life counter, and the round settlement charges the
 * field's leaks once the wave is over.
 */
function markCreepEscaped(
  state: MovementRuntimeState,
  deps: MovementRuntimeDeps,
  creep: CreepRenderState,
): void {
  if (creep.entity.status === 'escaped') {
    return;
  }

  creep.entity.status = 'escaped';
  deps.soundRouter.playCreepSound(creep, CreepSoundSlot.ESCAPE);
  deps.playSound('economy.life_lost');
  deps.onHudChanged();

  deps.onEscapedCountUpdated(countEscapedCreeps(state.activeCreeps));
}

function countEscapedCreeps(creeps: readonly CreepRenderState[]): number {
  let escapedCount = 0;
  for (let index = 0; index < creeps.length; index += 1) {
    if (creeps[index].entity.status === 'escaped') {
      escapedCount += 1;
    }
  }
  return escapedCount;
}

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

function readSpritePosition(creep: CreepRenderState, out: MutablePoint): void {
  out.x = creep.sprite.x;
  out.y = creep.sprite.y;
}

function commitSpriteMove(creep: CreepRenderState, position: MutablePoint, route: WaveRoute): void {
  creep.sprite.setPosition(position.x, position.y);
  syncCreepRenderDepth(creep);
  syncCreepEffectPipPosition(creep);
  faceCurrentSegment(creep, route);
}

/**
 * Moves every alive creep along the wave route for its size class. A creep
 * stands on its footprint centre: the anchor cell centre plus the render
 * state's footprint offset (non-zero only for large creeps). The walking
 * itself is the renderer-free `walkCreepsAlongRoutes`; this adds the sprite.
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

  // One motion object and one exit callback for every call instead of a fresh
  // pair per frame. The call's field is parked in `escapeContext` for the
  // callback and the previous one restored afterwards, so a nested call
  // (none exists today) would still see its own field.
  const previousState = escapeContext.state;
  const previousDeps = escapeContext.deps;
  spriteMotion.writeCellCenter = deps.writeCellCenter;
  spriteMotion.baseMoveSpeedPxPerSec = config.creepBaseMoveSpeedPxPerSec;
  escapeContext.state = state;
  escapeContext.deps = deps;
  try {
    walkCreepsAlongRoutes(
      state.activeCreeps,
      state.activeCreepRoutes,
      spriteMotion,
      normalizedDeltaMs,
      markContextCreepEscaped,
    );
  } finally {
    escapeContext.state = previousState;
    escapeContext.deps = previousDeps;
  }
}

function writeNoCellCenter(): void {}

/** Reused by every `moveCreepsAlongPath` call; the per-call fields are set on entry. */
const spriteMotion: RouteWalkMotion<CreepRenderState> = {
  writeCellCenter: writeNoCellCenter,
  baseMoveSpeedPxPerSec: 0,
  readPositionPx: readSpritePosition,
  commitMove: commitSpriteMove,
};

/** The field `markContextCreepEscaped` reports to, set for the duration of a move. */
const escapeContext: { state?: MovementRuntimeState; deps?: MovementRuntimeDeps } = {};

function markContextCreepEscaped(creep: CreepRenderState): void {
  const { state, deps } = escapeContext;
  if (state === undefined || deps === undefined) {
    return;
  }
  markCreepEscaped(state, deps, creep);
}
