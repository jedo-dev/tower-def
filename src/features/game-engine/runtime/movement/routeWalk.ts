import { getEffectiveSpeedMultiplier, type CreepEntity } from '../../../../entities/creep';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import { getRemainingRouteDistance } from '../../../../shared/lib/pathfinding/routeProgress';
import {
  hasWaveRoute,
  selectWaveRoute,
  type WaveRoute,
  type WaveRoutes,
} from '../../../../shared/lib/pathfinding/waveRoutes';

// Renderer-free core of creep movement. The Phaser movement runtime and the
// headless duel simulation both walk creeps through these functions; only the
// way a position is read and written back (sprite vs plain point) differs.

/** A point the movement core writes into instead of allocating a new one. */
export type MutablePoint = { x: number; y: number };

/** Writes the pixel centre of `position`'s cell into `out`. */
export type WriteCellCenter = (position: GridPosition, out: MutablePoint) => void;

/** Anything that walks a wave route: the entity plus its footprint offset. */
export type RouteWalker = {
  entity: CreepEntity;
  /** Pixels from the anchor cell centre to the footprint centre; zero when omitted. */
  footprintCenterOffsetPx?: number;
};

/** How positions move between the walker and the core. */
export type RouteWalkMotion<C extends RouteWalker> = {
  writeCellCenter: WriteCellCenter;
  baseMoveSpeedPxPerSec: number;
  /** Copies the walker's current pixel position into `out`. */
  readPositionPx: (creep: C, out: MutablePoint) => void;
  /** Stores the position after a step; `route` is the route the creep walks. */
  commitMove: (creep: C, positionPx: MutablePoint, route: WaveRoute) => void;
};

/** Scratch waypoint reused for every creep and step, so movement never allocates. */
const waypointPx: MutablePoint = { x: 0, y: 0 };
/** Scratch for the waypoint the creep last reached; same no-allocation rule. */
const previousWaypointPx: MutablePoint = { x: 0, y: 0 };
/** Scratch position handed to `readPositionPx` / `commitMove`. */
const positionPx: MutablePoint = { x: 0, y: 0 };

/** Pixels a creep covers in `deltaMs`, after speed modifiers such as chill or stun. */
export function computeCreepStepDistancePx(
  entity: CreepEntity,
  deltaMs: number,
  baseMoveSpeedPxPerSec: number,
): number {
  return (
    (deltaMs / 1000) * baseMoveSpeedPxPerSec * entity.speed * getEffectiveSpeedMultiplier(entity)
  );
}

/**
 * Records how far the creep still has to walk, in cells along its own route,
 * so targeting can compare creeps on routes of different lengths.
 * `pixelsToNextWaypoint` is what is left of the current segment.
 */
function writeRemainingRouteDistance(
  entity: CreepEntity,
  route: WaveRoute,
  writeCellCenter: WriteCellCenter,
  pixelsToNextWaypoint: number,
): void {
  const index = entity.pathIndex;
  if (index + 1 >= route.length) {
    entity.remainingRouteDistance = 0;
    return;
  }

  writeCellCenter(route[index], previousWaypointPx);
  writeCellCenter(route[index + 1], waypointPx);
  const segmentPx = Math.hypot(
    waypointPx.x - previousWaypointPx.x,
    waypointPx.y - previousWaypointPx.y,
  );
  const fractionLeft = segmentPx > 0 ? Math.min(1, pixelsToNextWaypoint / segmentPx) : 0;
  entity.remainingRouteDistance = getRemainingRouteDistance(route, index, fractionLeft);
}

/**
 * Advances one creep `distancePx` along its route, moving `position` in place.
 * Distance left over after a waypoint carries into the next segment, so a
 * diagonal step (sqrt 2 cells long) takes sqrt 2 times as long as an
 * orthogonal one at the same speed. Returns true when the creep reached the
 * last waypoint.
 */
export function advanceCreepAlongRoute(
  creep: RouteWalker,
  route: WaveRoute,
  writeCellCenter: WriteCellCenter,
  position: MutablePoint,
  distancePx: number,
): boolean {
  const footprintCenterOffsetPx = creep.footprintCenterOffsetPx ?? 0;
  let remainingPx = distancePx;
  let hasReachedExit = false;
  // Stays infinite when the step ends exactly on a waypoint: the whole next
  // segment is still ahead.
  let pixelsToNextWaypoint = Number.POSITIVE_INFINITY;

  while (remainingPx > 0) {
    const nextPathIndex = creep.entity.pathIndex + 1;
    const nextPoint = route[nextPathIndex];
    writeCellCenter(nextPoint, waypointPx);
    const dx = waypointPx.x + footprintCenterOffsetPx - position.x;
    const dy = waypointPx.y + footprintCenterOffsetPx - position.y;
    const distanceToNext = Math.hypot(dx, dy);

    if (distanceToNext > remainingPx) {
      const ratio = remainingPx / distanceToNext;
      position.x += dx * ratio;
      position.y += dy * ratio;
      pixelsToNextWaypoint = distanceToNext - remainingPx;
      break;
    }

    position.x += dx;
    position.y += dy;
    remainingPx -= distanceToNext;
    creep.entity.pathIndex = nextPathIndex;
    creep.entity.position = { x: nextPoint.x, y: nextPoint.y };

    if (nextPathIndex >= route.length - 1) {
      hasReachedExit = true;
      break;
    }
  }

  writeRemainingRouteDistance(creep.entity, route, writeCellCenter, pixelsToNextWaypoint);
  return hasReachedExit;
}

/**
 * Moves every alive creep along the wave route for its size class and reports
 * each one that reaches the exit. `deltaMs` is used as given; clamping frame
 * hitches is the caller's job.
 */
export function walkCreepsAlongRoutes<C extends RouteWalker>(
  creeps: readonly C[],
  routes: WaveRoutes,
  motion: RouteWalkMotion<C>,
  deltaMs: number,
  onReachedExit: (creep: C) => void,
): void {
  if (!hasWaveRoute(routes) || creeps.length === 0) {
    return;
  }

  for (const creep of creeps) {
    if (creep.entity.status !== 'alive') {
      continue;
    }

    const route = selectWaveRoute(routes, creep.entity.sizeClass);

    // A stunned creep holds its ground but must still be able to leak once it
    // is already standing on the exit, so movement stops after the escape check.
    if (creep.entity.pathIndex + 1 >= route.length) {
      onReachedExit(creep);
      continue;
    }

    const stepDistancePx = computeCreepStepDistancePx(
      creep.entity,
      deltaMs,
      motion.baseMoveSpeedPxPerSec,
    );

    if (stepDistancePx <= 0) {
      continue;
    }

    motion.readPositionPx(creep, positionPx);
    const hasReachedExit = advanceCreepAlongRoute(
      creep,
      route,
      motion.writeCellCenter,
      positionPx,
      stepDistancePx,
    );
    motion.commitMove(creep, positionPx, route);

    if (hasReachedExit) {
      onReachedExit(creep);
    }
  }
}
