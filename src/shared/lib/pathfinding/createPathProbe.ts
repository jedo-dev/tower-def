import type { Footprint, GridModel, GridPoint } from '../../types/grid';
import type { GridPosition } from '../../types/pathfinding';

/**
 * Shortest path after blocking some extra cells.
 * `path` is null when those cells would seal the field off.
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
  /**
   * Result of blocking every cell of a footprint anchored at its top-left
   * cell. Sealed when any covered cell lies off the grid. Memoized per anchor.
   */
  probeFootprint(anchor: GridPoint, footprint: Readonly<Footprint>): PathProbeResult;
  /** True for towers, non-walkable cells and anything outside the grid. */
  isBlocked(position: GridPosition): boolean;
};

const NEIGHBOR_DX = [1, -1, 0, 0] as const;
const NEIGHBOR_DY = [0, 0, 1, -1] as const;

const SEALED: PathProbeResult = { path: null, length: 0 };

/**
 * Repeated "how long would the path be if I walled these cells off" queries
 * over one grid. The opponent asks this for every candidate tower on every
 * build round, so the grid is flattened into typed arrays once and each BFS
 * reuses them; `findPathBfs` allocates string keys and maps per run, which is
 * far too slow to run a few hundred times per round.
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
  const extraBlockedStamp = new Int32Array(size);
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

  /** BFS with the cells stamped `stamp` in `extraBlockedStamp` walled off. */
  function runBfs(): PathProbeResult {
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
    if (extraBlockedStamp[entranceIndex] === stamp || extraBlockedStamp[exitIndex] === stamp) {
      return SEALED;
    }

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

        if (
          visitStamp[next] === stamp ||
          blocked[next] === 1 ||
          extraBlockedStamp[next] === stamp
        ) {
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

  stamp += 1;
  const base = runBfs();
  const isOnBasePath = new Uint8Array(size);
  for (const position of base.path ?? []) {
    isOnBasePath[toIndex(position)] = 1;
  }
  const cache = new Map<string, PathProbeResult>();

  function probeBlock(anchor: GridPoint, width: number, height: number): PathProbeResult {
    const corner = { x: anchor.x + width - 1, y: anchor.y + height - 1 };
    if (width <= 0 || height <= 0 || !isInside(anchor) || !isInside(corner)) {
      return SEALED;
    }

    const cacheKey = `${toIndex(anchor)}:${width}x${height}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    stamp += 1;
    let addsNewWall = false;
    let touchesBasePath = false;
    for (let offsetY = 0; offsetY < height; offsetY += 1) {
      for (let offsetX = 0; offsetX < width; offsetX += 1) {
        const index = (anchor.y + offsetY) * cols + anchor.x + offsetX;
        extraBlockedStamp[index] = stamp;
        addsNewWall ||= blocked[index] === 0;
        touchesBasePath ||= isOnBasePath[index] === 1;
      }
    }

    // Re-blocking already blocked cells changes nothing (callers reject those
    // placements on their own occupancy check), and walls off the shortest
    // route leave it intact and still shortest.
    const result = addsNewWall && touchesBasePath ? runBfs() : base;
    cache.set(cacheKey, result);
    return result;
  }

  return {
    basePath: base.path ?? [],
    baseLength: base.length,
    probe(position: GridPosition): PathProbeResult {
      return probeBlock(position, 1, 1);
    },
    probeFootprint(anchor: GridPoint, footprint: Readonly<Footprint>): PathProbeResult {
      return probeBlock(anchor, footprint.width, footprint.height);
    },
    isBlocked(position: GridPosition): boolean {
      return !isInside(position) || blocked[toIndex(position)] === 1;
    },
  };
}
