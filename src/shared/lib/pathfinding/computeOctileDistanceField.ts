import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';
import {
  OCTILE_DIRECTION_COUNT,
  createOctileGrid,
  getStepCost,
  getStepTarget,
  isInsideOctileGrid,
  type OctileSearchOptions,
} from './octileGrid';
import { createOctilePriorityQueue } from './octilePriorityQueue';

export type OctileDistanceField = {
  cols: number;
  rows: number;
  /**
   * Octile cost to reach the goal from each cell, row-major (`y * cols + x`).
   * Infinity for blocked or unreachable cells. Movement rules are symmetric,
   * so this is both the distance from and the distance to the goal.
   */
  distances: Float64Array;
};

/**
 * Dijkstra from `goal` over the whole grid with the same movement rules as
 * `findOctilePath` (8 directions, no corner cutting). A flow field follows the
 * neighbour with the lowest distance. An outside or blocked goal yields a
 * field of Infinity.
 */
export function computeOctileDistanceField(
  grid: GridModel,
  goal: GridPosition,
  options?: OctileSearchOptions,
): OctileDistanceField {
  const octileGrid = createOctileGrid(grid, options);
  const { cols, rows } = octileGrid;
  const size = cols * rows;
  const distances = new Float64Array(size).fill(Infinity);

  if (!isInsideOctileGrid(octileGrid, goal.x, goal.y)) {
    return { cols, rows, distances };
  }

  const goalIndex = goal.y * cols + goal.x;

  if (octileGrid.passable[goalIndex] === 0) {
    return { cols, rows, distances };
  }

  const settled = new Uint8Array(size);
  const open = createOctilePriorityQueue(size);
  distances[goalIndex] = 0;
  open.push(goalIndex, 0, 0);

  while (open.size > 0) {
    const current = open.pop();

    if (settled[current] === 1) {
      continue;
    }

    settled[current] = 1;
    const currentX = current % cols;
    const currentY = (current - currentX) / cols;

    for (let direction = 0; direction < OCTILE_DIRECTION_COUNT; direction += 1) {
      const neighbor = getStepTarget(octileGrid, currentX, currentY, direction);

      if (neighbor === -1 || settled[neighbor] === 1) {
        continue;
      }

      const tentative = distances[current] + getStepCost(direction);

      if (tentative < distances[neighbor]) {
        distances[neighbor] = tentative;
        open.push(neighbor, tentative, 0);
      }
    }
  }

  return { cols, rows, distances };
}
