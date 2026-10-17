import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import {
  ACTOR_RENDER_DEPTH_PER_WORLD_PX,
  AIR_CREEP_RENDER_DEPTH,
  GROUND_ACTOR_RENDER_DEPTH_BASE,
  TOWER_RENDER_DEPTH_COLUMN_STEP,
} from '../../scenes/gameScene.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { toTowerSpriteFootPoint } from './towerVisualMetrics';

/**
 * Towers and ground creeps share one depth band sorted by where they touch the
 * ground (larger world y = nearer the viewer = drawn later), so a creep in
 * front of a tower draws over it and one behind it walks under its overhang.
 * Flyers draw above every ground actor.
 */
export function resolveGroundActorDepth(footWorldY: number): number {
  return GROUND_ACTOR_RENDER_DEPTH_BASE + footWorldY * ACTOR_RENDER_DEPTH_PER_WORLD_PX;
}

/**
 * A tower sorts by the bottom edge of its footprint; the column only breaks
 * ties between towers of one row. A tower directly below another draws over
 * the upper one's base, never the other way round.
 */
export function resolveTowerRenderDepth(
  anchor: GridPosition,
  cellSizePx: number = GRID_DIMENSIONS.cellSize,
): number {
  return (
    resolveGroundActorDepth(toTowerSpriteFootPoint(anchor, cellSizePx).y) +
    anchor.x * TOWER_RENDER_DEPTH_COLUMN_STEP
  );
}

/**
 * A ground creep sorts by the centre of the cell row its centre is in. Tower
 * bottoms lie on row edges, so the row centre orders a creep against every
 * tower exactly like its true position would, while its depth (and the
 * display-list sort it triggers) changes only when it crosses a row.
 */
export function resolveCreepRenderDepth(
  centerWorldY: number,
  isAirborne: boolean,
  cellSizePx: number = GRID_DIMENSIONS.cellSize,
): number {
  if (isAirborne) {
    return AIR_CREEP_RENDER_DEPTH;
  }
  return resolveGroundActorDepth((Math.floor(centerWorldY / cellSizePx) + 0.5) * cellSizePx);
}

/** Re-sorts a creep after a move; a no-op (and no depth sort) within one row. */
export function syncCreepRenderDepth(creep: CreepRenderState): void {
  const depth = resolveCreepRenderDepth(creep.sprite.y, creep.entity.moveType === UnitMoveType.AIR);
  if (creep.sprite.depth !== depth) {
    creep.sprite.setDepth(depth);
  }
}
