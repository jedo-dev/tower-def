import type { GridModel } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';

/**
 * Shortest path after blocking one extra cell.
 * `path` is null when that cell would seal the field off.
 */
export type PathProbeResult = {
  path: readonly GridPosition[] | null;
  /** Cell count of the path, entrance and exit included. Zero when sealed. */
  length: number;
};

export type PathProbe = {
  /** Shortest path with nothing extra blocked. */
  readonly basePath: readonly GridPosition[];
  readonly baseLength: number;
  /** Result of blocking one extra cell. Memoized per position. */
  probe(position: GridPosition): PathProbeResult;
  /** True for towers, non-walkable cells and anything outside the grid. */
  isBlocked(position: GridPosition): boolean;
};

const NEIGHBOR_DX = [1, -1, 0, 0] as const;
const NEIGHBOR_DY = [0, 0, 1, -1] as const;

const SEALED: PathProbeResult = { path: null, length: 0 };

/**
 * Repeated "how long would the path be if I walled this cell off" queries over
 * one grid. The opponent asks this for every candidate cell on every build
 * round, so the grid is flattened into typed arrays once and each BFS reuses
 * them; `findPathBfs` rescans `grid.cells` per neighbour, which is far too slow
 * to run a few hundred times per round.
 */
export function createPathProbe(grid: GridModel): PathProbe {
  const { cols, rows } = grid;
  const size = Math.max(0, cols * rows);

  const blocked = new Uint8Array(size).fill(1);
  for (const cell of grid.cells) {
    if (cell.x < 0 || cell.x >= cols || cell.y < 0 || cell.y >= rows) {
      continue;
    }
    if (cell.isWalkable && !cell.isOccupied) {
      blocked[cell.y * cols + cell.x] = 0;
    }
  }

  const parent = new Int32Array(size);
  const queue = new Int32Array(size);
  const visitStamp = new Int32Array(size);
  let stamp = 0;

  function isInside(position: GridPosition): boolean {
    return position.x >= 0 && position.x < cols && position.y >= 0 && position.y < rows;
  }

  function toIndex(position: GridPosition): number {
    return position.y * cols + position.x;
  }

  function buildPath(endIndex: number): GridPosition[] {
    const path: GridPosition[] = [];
    let current = endIndex;

    while (current !== -1) {
      const x = current % cols;
      path.push({ x, y: (current - x) / cols });
      current = parent[current];
    }

    return path.reverse();
  }

  function runBfs(extraBlockedIndex: number): PathProbeResult {
    if (size === 0 || !isInside(grid.entrance) || !isInside(grid.exit)) {
      return SEALED;
    }

    const entranceIndex = toIndex(grid.entrance);
    const exitIndex = toIndex(grid.exit);

    if (entranceIndex === exitIndex) {
      const path = [{ x: grid.entrance.x, y: grid.entrance.y }];
      return { path, length: path.length };
    }

    // Walling the entrance or the exit itself is never a legal placement.
    if (extraBlockedIndex === entranceIndex || extraBlockedIndex === exitIndex) {
      return SEALED;
    }

    stamp += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = entranceIndex;
    tail += 1;
    visitStamp[entranceIndex] = stamp;
    parent[entranceIndex] = -1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      const currentX = current % cols;
      const currentY = (current - currentX) / cols;

      for (let direction = 0; direction < 4; direction += 1) {
        const nextX = currentX + NEIGHBOR_DX[direction];
        const nextY = currentY + NEIGHBOR_DY[direction];

        if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) {
          continue;
        }

        const next = nextY * cols + nextX;

        if (visitStamp[next] === stamp || blocked[next] === 1 || next === extraBlockedIndex) {
          continue;
        }

        visitStamp[next] = stamp;
        parent[next] = current;

        if (next === exitIndex) {
          const path = buildPath(next);
          return { path, length: path.length };
        }

        queue[tail] = next;
        tail += 1;
      }
    }

    return SEALED;
  }

  const base = runBfs(-1);
  const cache = new Map<number, PathProbeResult>();

  return {
    basePath: base.path ?? [],
    baseLength: base.length,
    probe(position: GridPosition): PathProbeResult {
      if (!isInside(position)) {
        return SEALED;
      }

      const index = toIndex(position);
      const cached = cache.get(index);
      if (cached) {
        return cached;
      }

      // Re-blocking an already blocked cell changes nothing; callers reject
      // those placements on their own occupancy check.
      const result = blocked[index] === 1 ? base : runBfs(index);
      cache.set(index, result);
      return result;
    },
    isBlocked(position: GridPosition): boolean {
      return !isInside(position) || blocked[toIndex(position)] === 1;
    },
  };
}
