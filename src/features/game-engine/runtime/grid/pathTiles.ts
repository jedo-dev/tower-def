import type { GridCell, GridPoint } from '../../../../shared/types/grid';

/** Key format the grid renderer looks path cells up by. */
export function toPathCellKey(point: GridPoint): string {
  return `${point.x}:${point.y}`;
}

export function toPathCellKeys(route: readonly GridPoint[]): Set<string> {
  return new Set(route.map(toPathCellKey));
}

/**
 * Cells the trail ribbon covers or brushes: the route's cells plus, for each
 * diagonal step, the two cells flanking it (the ribbon cuts across their
 * shared corner). The grid renderer keeps props off these cells.
 */
export function toTrailCellKeys(route: readonly GridPoint[]): Set<string> {
  const keys = toPathCellKeys(route);
  for (let index = 1; index < route.length; index += 1) {
    const from = route[index - 1];
    const to = route[index];
    if (from.x !== to.x && from.y !== to.y) {
      keys.add(toPathCellKey({ x: to.x, y: from.y }));
      keys.add(toPathCellKey({ x: from.x, y: to.y }));
    }
  }
  return keys;
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
 * lost trail membership (their props come and go). The new trail set is handed
 * to `onPathCellKeysChanged` before any redraw, so `drawCell` already renders
 * against it.
 */
export function refreshPathTiles(
  cells: readonly GridCell[],
  previousPathCellKeys: ReadonlySet<string>,
  route: readonly GridPoint[],
  onPathCellKeysChanged: (nextPathCellKeys: Set<string>) => void,
  drawCell: (cell: GridCell) => void,
): void {
  const nextPathCellKeys = toTrailCellKeys(route);
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
