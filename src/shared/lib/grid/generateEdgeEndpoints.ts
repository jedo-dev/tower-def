import type { GridPoint } from '../../types/grid';
import { GRID_DIMENSIONS } from '../../constants/grid';
import { hasPathBfs } from '../pathfinding/hasPathBfs';
import { createGridModel } from './createGridModel';

export type EdgeEndpoints = {
  entrance: GridPoint;
  exit: GridPoint;
};

export type GenerateEdgeEndpointsOptions = {
  cols?: number;
  rows?: number;
  minManhattanDistance?: number;
};

export const DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE = Math.max(
  GRID_DIMENSIONS.cols,
  GRID_DIMENSIONS.rows,
);

// mulberry32: tiny deterministic PRNG so the same seed always yields the
// same endpoints on every client.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function collectEdgeCells(cols: number, rows: number): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let x = 0; x < cols; x += 1) {
    cells.push({ x, y: 0 });
    if (rows > 1) {
      cells.push({ x, y: rows - 1 });
    }
  }
  for (let y = 1; y < rows - 1; y += 1) {
    cells.push({ x: 0, y });
    if (cols > 1) {
      cells.push({ x: cols - 1, y });
    }
  }
  return cells;
}

function manhattanDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function areAdjacent(a: GridPoint, b: GridPoint): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

export function generateEdgeEndpoints(
  seed: number,
  options?: GenerateEdgeEndpointsOptions,
): EdgeEndpoints {
  const cols = options?.cols ?? GRID_DIMENSIONS.cols;
  const rows = options?.rows ?? GRID_DIMENSIONS.rows;
  const minDistance = options?.minManhattanDistance ?? DEFAULT_EDGE_ENDPOINT_MIN_DISTANCE;

  const random = createSeededRandom(seed);
  const edgeCells = collectEdgeCells(cols, rows);
  const entrance = edgeCells[Math.floor(random() * edgeCells.length)];

  const exitCandidates = edgeCells.filter(
    (cell) =>
      !areAdjacent(cell, entrance) && manhattanDistance(cell, entrance) >= minDistance,
  );

  let exit: GridPoint;
  if (exitCandidates.length > 0) {
    exit = exitCandidates[Math.floor(random() * exitCandidates.length)];
  } else {
    // Requested distance is unreachable on this grid: take the farthest cell.
    exit = edgeCells.reduce((farthest, cell) =>
      manhattanDistance(cell, entrance) > manhattanDistance(farthest, entrance)
        ? cell
        : farthest,
    );
  }

  const isPathable =
    cols === GRID_DIMENSIONS.cols && rows === GRID_DIMENSIONS.rows
      ? hasPathBfs(createGridModel({ entrance, exit }))
      : true;
  if (!isPathable) {
    return {
      entrance: { x: 0, y: Math.floor((rows - 1) / 2) },
      exit: { x: cols - 1, y: Math.floor((rows - 1) / 2) },
    };
  }

  return { entrance, exit };
}
