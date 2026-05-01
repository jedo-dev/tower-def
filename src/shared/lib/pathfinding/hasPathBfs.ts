import type { GridModel } from '../../types/grid';
import type { GridPosition, PathResult } from '../../types/pathfinding';

function toCellKey(point: GridPosition): string {
  return `${point.x}:${point.y}`;
}

function isInsideGrid(point: GridPosition, grid: GridModel): boolean {
  return point.x >= 0 && point.x < grid.cols && point.y >= 0 && point.y < grid.rows;
}

function getNeighbors(point: GridPosition): GridPosition[] {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ];
}

function buildPath(
  parentByKey: Map<string, string | null>,
  endKey: string,
  positionByKey: Map<string, GridPosition>,
): GridPosition[] {
  const path: GridPosition[] = [];
  let currentKey: string | null = endKey;

  while (currentKey !== null) {
    const position = positionByKey.get(currentKey);

    if (!position) {
      break;
    }

    path.push(position);
    currentKey = parentByKey.get(currentKey) ?? null;
  }

  return path.reverse();
}

function isCellBlocked(point: GridPosition, grid: GridModel): boolean {
  const cell = grid.cells.find((candidate) => candidate.x === point.x && candidate.y === point.y);

  if (!cell) {
    return true;
  }

  return !cell.isWalkable || cell.isOccupied;
}

export function findPathBfs(grid: GridModel): PathResult {
  if (!isInsideGrid(grid.entrance, grid) || !isInsideGrid(grid.exit, grid)) {
    return {
      found: false,
      path: [],
    };
  }

  const startKey = toCellKey(grid.entrance);
  const targetKey = toCellKey(grid.exit);

  if (startKey === targetKey) {
    return {
      found: true,
      path: [{ x: grid.entrance.x, y: grid.entrance.y }],
    };
  }

  const visited = new Set<string>([startKey]);
  const queue: GridPosition[] = [{ x: grid.entrance.x, y: grid.entrance.y }];
  const parentByKey = new Map<string, string | null>([[startKey, null]]);
  const positionByKey = new Map<string, GridPosition>([[startKey, { ...grid.entrance }]]);
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;

    for (const neighbor of getNeighbors(current)) {
      if (!isInsideGrid(neighbor, grid)) {
        continue;
      }

      if (isCellBlocked(neighbor, grid)) {
        continue;
      }

      const neighborKey = toCellKey(neighbor);

      if (visited.has(neighborKey)) {
        continue;
      }

      visited.add(neighborKey);
      parentByKey.set(neighborKey, toCellKey(current));
      positionByKey.set(neighborKey, { x: neighbor.x, y: neighbor.y });

      if (neighborKey === targetKey) {
        return {
          found: true,
          path: buildPath(parentByKey, neighborKey, positionByKey),
        };
      }

      queue.push({ x: neighbor.x, y: neighbor.y });
    }
  }

  return {
    found: false,
    path: [],
  };
}

export function hasPathBfs(grid: GridModel): boolean {
  return findPathBfs(grid).found;
}
