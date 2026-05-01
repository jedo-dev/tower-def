import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';

export function calculateWaveStartPath(grid: GridModel): GridPosition[] {
  const result = findPathBfs(grid);

  if (!result.found) {
    return [];
  }

  return result.path;
}
