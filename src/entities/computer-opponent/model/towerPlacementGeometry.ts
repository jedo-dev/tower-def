import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { getFootprintCells, isFootprintInBounds } from '../../../shared/lib/grid/footprint';
import { getCellAt } from '../../../shared/lib/grid/getCellAt';
import type { PathProbe } from '../../../shared/lib/pathfinding/createPathProbe';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';

/** Why a tower block cannot stand at an anchor, before the route is checked. */
export type FootprintBlockReason = 'out_of_bounds' | 'entrance_or_exit' | 'occupied';

/**
 * A wall grows one block at a time. Touching walls on exactly one side means
 * this block extends a wall; three or more sides means it is plugging a
 * pocket, which costs a tower and lengthens nothing.
 */
const WALL_SYNERGY_BY_BLOCKED_SIDES: readonly number[] = [0.2, 1, 0.7, 0.15, 0];

/** Null when every cell of the tower block is free to build on. */
export function classifyTowerFootprint(
  grid: GridModel,
  anchor: GridPosition,
): FootprintBlockReason | null {
  if (!isFootprintInBounds(grid, anchor, TOWER_FOOTPRINT)) {
    return 'out_of_bounds';
  }

  let isOccupied = false;
  for (const point of getFootprintCells(anchor, TOWER_FOOTPRINT)) {
    const cell = getCellAt(grid, point.x, point.y);
    if (!cell) {
      return 'out_of_bounds';
    }
    if (cell.role !== 'empty') {
      return 'entrance_or_exit';
    }
    isOccupied ||= cell.isOccupied || !cell.isWalkable;
  }

  return isOccupied ? 'occupied' : null;
}

function isCellBlocked(
  grid: GridModel,
  position: GridPosition,
  pathProbe: PathProbe | undefined,
): boolean {
  if (pathProbe) {
    return pathProbe.isBlocked(position);
  }

  const cell = getCellAt(grid, position.x, position.y);
  return !cell || !cell.isWalkable || cell.isOccupied;
}

/** The cells just outside each side of the tower block, grouped per side. */
function getSideNeighbors(anchor: GridPosition): readonly (readonly GridPosition[])[] {
  const { width, height } = TOWER_FOOTPRINT;
  const left: GridPosition[] = [];
  const right: GridPosition[] = [];
  const top: GridPosition[] = [];
  const bottom: GridPosition[] = [];

  for (let offset = 0; offset < height; offset += 1) {
    left.push({ x: anchor.x - 1, y: anchor.y + offset });
    right.push({ x: anchor.x + width, y: anchor.y + offset });
  }
  for (let offset = 0; offset < width; offset += 1) {
    top.push({ x: anchor.x + offset, y: anchor.y - 1 });
    bottom.push({ x: anchor.x + offset, y: anchor.y + height });
  }

  return [left, right, top, bottom];
}

/** Rewards extending an existing wall (or the field edge) by one more block. */
export function computeWallSynergyScore(
  grid: GridModel,
  anchor: GridPosition,
  pathProbe: PathProbe | undefined,
): number {
  let blockedSides = 0;
  for (const side of getSideNeighbors(anchor)) {
    if (side.some((neighbor) => isCellBlocked(grid, neighbor, pathProbe))) {
      blockedSides += 1;
    }
  }

  return WALL_SYNERGY_BY_BLOCKED_SIDES[blockedSides] ?? 0;
}
