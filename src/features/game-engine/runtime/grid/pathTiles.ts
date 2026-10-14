import type { GridCell, GridPoint } from '../../../../shared/types/grid';

/** Key format the grid renderer looks path cells up by. */
export function toPathCellKey(point: GridPoint): string {
  return `${point.x}:${point.y}`;
}

export function toPathCellKeys(route: readonly GridPoint[]): Set<string> {
  return new Set(route.map(toPathCellKey));
}

/**
 * Cells whose path-tile membership differs between two path sets: the only
 * terrain tiles that need a redraw when the shown route changes.
 */
export function findPathTileChanges(
  cells: readonly GridCell[],
  previousPathCellKeys: ReadonlySet<string>,
  nextPathCellKeys: ReadonlySet<string>,
): GridCell[] {
  return cells.filter((cell) => {
    const key = toPathCellKey(cell);
    return previousPathCellKeys.has(key) !== nextPathCellKeys.has(key);
  });
}

/**
 * Switches the shown path to `route`, redrawing only the tiles that gained or
 * lost path membership. The new path set is handed to `onPathCellKeysChanged`
 * before any redraw, so `drawCell` already renders against it.
 */
export function refreshPathTiles(
  cells: readonly GridCell[],
  previousPathCellKeys: ReadonlySet<string>,
  route: readonly GridPoint[],
  onPathCellKeysChanged: (nextPathCellKeys: Set<string>) => void,
  drawCell: (cell: GridCell) => void,
): void {
  const nextPathCellKeys = toPathCellKeys(route);
  const changedCells = findPathTileChanges(cells, previousPathCellKeys, nextPathCellKeys);
  onPathCellKeysChanged(nextPathCellKeys);
  changedCells.forEach(drawCell);
}

/**
 * Route the player's path tiles follow. While building they track the board
 * as it stands (from match start, before any wave has routed), so the first
 * build phase already shows the path; during a wave they show its routes.
 */
export function selectPlayerPathRoute(
  isBuildPhase: boolean,
  resolveBuildPhaseRoute: () => readonly GridPoint[],
  waveRoute: readonly GridPoint[],
): readonly GridPoint[] {
  return isBuildPhase ? resolveBuildPhaseRoute() : waveRoute;
}
