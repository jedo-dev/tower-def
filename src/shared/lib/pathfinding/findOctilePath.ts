import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import {
  OCTILE_DIRECTION_COUNT,
  createOctileGrid,
  getStepCost,
  getStepTarget,
  isInsideOctileGrid,
  octileHeuristic,
  type OctileGrid,
  type OctileSearchOptions,
} from './octileGrid';
import { createOctilePriorityQueue } from './octilePriorityQueue';

export type OctilePathOptions = OctileSearchOptions;

export type OctilePathSearchResult = {
  /** Cells from start to goal, both included; null when unreachable. */
  path: readonly GridPosition[] | null;
  /** Total step cost (1 per orthogonal, sqrt(2) per diagonal step); Infinity when unreachable. */
  cost: number;
  /** Cells popped from the open set and expanded; a stable measure of search work. */
  expandedCount: number;
};

const UNREACHABLE: OctilePathSearchResult = { path: null, cost: Infinity, expandedCount: 0 };

function buildPath(grid: OctileGrid, parent: Int32Array, goalIndex: number): GridPosition[] {
  const path: GridPosition[] = [];
  let current = goalIndex;

  while (current !== -1) {
    const x = current % grid.cols;
    path.push({ x, y: (current - x) / grid.cols });
    current = parent[current];
  }

  return path.reverse();
}

function runAStar(
  grid: OctileGrid,
  start: GridPosition,
  goal: GridPosition,
): OctilePathSearchResult {
  const { cols } = grid;
  const size = cols * grid.rows;
  const startIndex = start.y * cols + start.x;
  const goalIndex = goal.y * cols + goal.x;

  const costFromStart = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = createOctilePriorityQueue(size);

  const startHeuristic = octileHeuristic(start.x, start.y, goal.x, goal.y);
  costFromStart[startIndex] = 0;
  open.push(startIndex, startHeuristic, startHeuristic);
  let expandedCount = 0;

  while (open.size > 0) {
    const current = open.pop();

    if (closed[current] === 1) {
      continue;
    }

    closed[current] = 1;
    expandedCount += 1;

    if (current === goalIndex) {
      return {
        path: buildPath(grid, parent, goalIndex),
        cost: costFromStart[goalIndex],
        expandedCount,
      };
    }

    const currentX = current % cols;
    const currentY = (current - currentX) / cols;

    for (let direction = 0; direction < OCTILE_DIRECTION_COUNT; direction += 1) {
      const neighbor = getStepTarget(grid, currentX, currentY, direction);

      if (neighbor === -1 || closed[neighbor] === 1) {
        continue;
      }

      const tentativeCost = costFromStart[current] + getStepCost(direction);

      if (tentativeCost >= costFromStart[neighbor]) {
        continue;
      }

      const neighborX = neighbor % cols;
      const heuristic = octileHeuristic(neighborX, (neighbor - neighborX) / cols, goal.x, goal.y);
      costFromStart[neighbor] = tentativeCost;
      parent[neighbor] = current;
      open.push(neighbor, tentativeCost + heuristic, heuristic);
    }
  }

  return { path: null, cost: Infinity, expandedCount };
}

/**
 * Deterministic 8-direction A* with search statistics. Cells are passable when
 * `isWalkable && !isOccupied` (plus `options.isPassable`); diagonal steps are
 * rejected unless both orthogonal neighbours are passable, so towers touching
 * at a corner form a wall. The start cell only has to be inside the grid; the
 * goal must be passable. Ties are broken by lower f, then lower heuristic,
 * then insertion order, with a fixed neighbour order.
 */
export function searchOctilePath(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
  options?: OctilePathOptions,
): OctilePathSearchResult {
  const octileGrid = createOctileGrid(grid, options);

  if (
    !isInsideOctileGrid(octileGrid, start.x, start.y) ||
    !isInsideOctileGrid(octileGrid, goal.x, goal.y)
  ) {
    return UNREACHABLE;
  }

  if (start.x === goal.x && start.y === goal.y) {
    return { path: [{ x: start.x, y: start.y }], cost: 0, expandedCount: 0 };
  }

  if (octileGrid.passable[goal.y * octileGrid.cols + goal.x] === 0) {
    return UNREACHABLE;
  }

  return runAStar(octileGrid, start, goal);
}

/** Shortest 8-direction path from start to goal (both included), or null. */
export function findOctilePath(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
  options?: OctilePathOptions,
): readonly GridPosition[] | null {
  return searchOctilePath(grid, start, goal, options).path;
}

export function hasOctilePath(
  grid: GridModel,
  start: GridPosition,
  goal: GridPosition,
  options?: OctilePathOptions,
): boolean {
  return findOctilePath(grid, start, goal, options) !== null;
}
