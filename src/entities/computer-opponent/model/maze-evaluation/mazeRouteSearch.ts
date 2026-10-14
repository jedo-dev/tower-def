import { OCTILE_NEIGHBOR_DX, OCTILE_NEIGHBOR_DY } from '../../../../shared/constants/pathfinding';
import {
  OCTILE_DIRECTION_COUNT,
  getStepCost,
  octileHeuristic,
} from '../../../../shared/lib/pathfinding/octileGrid';
import { createOctilePriorityQueue } from '../../../../shared/lib/pathfinding/octilePriorityQueue';
import type { GridPoint } from '../../../../shared/types/grid';

/** Scratch arrays reused by every route search on one board size. */
export type MazeRouteSearchBuffers = {
  cols: number;
  rows: number;
  costFromStart: Float64Array;
  parent: Int32Array;
  closed: Uint8Array;
  /** Cells expanded by every search on these buffers so far; a stable measure of search work. */
  expandedNodeCount: number;
};

export function createMazeRouteSearchBuffers(cols: number, rows: number): MazeRouteSearchBuffers {
  const size = Math.max(0, cols) * Math.max(0, rows);

  return {
    cols,
    rows,
    costFromStart: new Float64Array(size),
    parent: new Int32Array(size),
    closed: new Uint8Array(size),
    expandedNodeCount: 0,
  };
}

function isInside(buffers: MazeRouteSearchBuffers, point: GridPoint): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.x < buffers.cols &&
    point.y >= 0 &&
    point.y < buffers.rows
  );
}

/**
 * Octile A* over a clearance buffer for an agentSize x agentSize agent, with
 * the rules and tie-breaking of `findRouteForSizeClass` (an anchor is passable
 * iff its clearance >= agentSize, no corner cutting, fixed neighbour order),
 * so both return the same route. Returns the route cost, or Infinity when
 * unreachable; afterwards `buffers.parent` holds the route for
 * `readMazeRoute`. Only the priority queue is allocated per call.
 *
 * `distanceField` (see `computeMazeDistanceField`), when given, replaces the
 * octile heuristic: distances to the goal measured on this board with fewer
 * blocks never overestimate, so the cost stays exact, but far fewer cells are
 * expanded inside a maze. Among equally short routes it may pick another one.
 */
export function searchMazeRouteCost(
  buffers: MazeRouteSearchBuffers,
  clearance: Uint8Array,
  agentSize: number,
  start: GridPoint,
  goal: GridPoint,
  distanceField: Float64Array | null = null,
): number {
  const { cols, rows, costFromStart, parent, closed } = buffers;

  if (!isInside(buffers, start) || !isInside(buffers, goal)) {
    return Infinity;
  }

  const startIndex = start.y * cols + start.x;
  const goalIndex = goal.y * cols + goal.x;
  parent.fill(-1);

  if (startIndex === goalIndex) {
    return 0;
  }

  if (clearance[goalIndex] < agentSize) {
    return Infinity;
  }

  costFromStart.fill(Infinity);
  closed.fill(0);
  const open = createOctilePriorityQueue(cols * rows);
  const startHeuristic = octileHeuristic(start.x, start.y, goal.x, goal.y);
  costFromStart[startIndex] = 0;
  open.push(startIndex, startHeuristic, startHeuristic);

  while (open.size > 0) {
    const current = open.pop();

    if (closed[current] === 1) {
      continue;
    }

    closed[current] = 1;
    buffers.expandedNodeCount += 1;

    if (current === goalIndex) {
      return costFromStart[goalIndex];
    }

    const currentX = current % cols;
    const currentY = (current - currentX) / cols;

    for (let direction = 0; direction < OCTILE_DIRECTION_COUNT; direction += 1) {
      const deltaX = OCTILE_NEIGHBOR_DX[direction];
      const deltaY = OCTILE_NEIGHBOR_DY[direction];
      const targetX = currentX + deltaX;
      const targetY = currentY + deltaY;

      if (targetX < 0 || targetX >= cols || targetY < 0 || targetY >= rows) {
        continue;
      }

      const target = targetY * cols + targetX;

      if (clearance[target] < agentSize || closed[target] === 1) {
        continue;
      }

      if (
        deltaX !== 0 &&
        deltaY !== 0 &&
        (clearance[currentY * cols + targetX] < agentSize ||
          clearance[targetY * cols + currentX] < agentSize)
      ) {
        continue;
      }

      const tentativeCost = costFromStart[current] + getStepCost(direction);

      if (tentativeCost >= costFromStart[target]) {
        continue;
      }

      const heuristic =
        distanceField === null
          ? octileHeuristic(targetX, targetY, goal.x, goal.y)
          : distanceField[target];
      if (heuristic === Infinity) {
        // Cut off from the goal even before the latest blocks went up.
        continue;
      }
      costFromStart[target] = tentativeCost;
      parent[target] = current;
      open.push(target, tentativeCost + heuristic, heuristic);
    }
  }

  return Infinity;
}

/**
 * Exact route cost from every cell to `goal` for an agentSize x agentSize
 * agent (Infinity where the goal cannot be reached), by Dijkstra outwards
 * from the goal under the same move rules as `searchMazeRouteCost`; moves are
 * symmetric, so this is also the cost of reaching the goal. Adding blocks
 * only ever lengthens these, so the field stays a valid heuristic for the
 * board it was measured on plus any blocks placed later.
 */
export function computeMazeDistanceField(
  buffers: MazeRouteSearchBuffers,
  clearance: Uint8Array,
  agentSize: number,
  goal: GridPoint,
  field: Float64Array,
): void {
  const { cols, rows, closed } = buffers;
  field.fill(Infinity);
  if (!isInside(buffers, goal) || clearance[goal.y * cols + goal.x] < agentSize) {
    return;
  }

  closed.fill(0);
  const open = createOctilePriorityQueue(cols * rows);
  const goalIndex = goal.y * cols + goal.x;
  field[goalIndex] = 0;
  open.push(goalIndex, 0, 0);

  while (open.size > 0) {
    const current = open.pop();
    if (closed[current] === 1) {
      continue;
    }
    closed[current] = 1;
    buffers.expandedNodeCount += 1;
    const currentX = current % cols;
    const currentY = (current - currentX) / cols;

    for (let direction = 0; direction < OCTILE_DIRECTION_COUNT; direction += 1) {
      const deltaX = OCTILE_NEIGHBOR_DX[direction];
      const deltaY = OCTILE_NEIGHBOR_DY[direction];
      const targetX = currentX + deltaX;
      const targetY = currentY + deltaY;
      if (targetX < 0 || targetX >= cols || targetY < 0 || targetY >= rows) {
        continue;
      }
      const target = targetY * cols + targetX;
      if (clearance[target] < agentSize || closed[target] === 1) {
        continue;
      }
      if (
        deltaX !== 0 &&
        deltaY !== 0 &&
        (clearance[currentY * cols + targetX] < agentSize ||
          clearance[targetY * cols + currentX] < agentSize)
      ) {
        continue;
      }
      const cost = field[current] + getStepCost(direction);
      if (cost < field[target]) {
        field[target] = cost;
        open.push(target, cost, 0);
      }
    }
  }
}

/** Route ending at `goal` from the parents left by the last successful search, start first. */
export function readMazeRoute(buffers: MazeRouteSearchBuffers, goal: GridPoint): GridPoint[] {
  const { cols, parent } = buffers;
  const route: GridPoint[] = [];
  let current = goal.y * cols + goal.x;

  while (current !== -1) {
    const x = current % cols;
    route.push({ x, y: (current - x) / cols });
    current = parent[current];
  }

  return route.reverse();
}
