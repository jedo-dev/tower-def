import {
  BOARD_SNAPSHOT_ROUTE_GLYPH,
  BoardSnapshotGlyph,
  DEFAULT_TOWER_FOOTPRINT_SIDE,
  RouteSizeClass,
} from '../../constants/board-snapshot';
import type { GridModel, GridPoint } from '../../types/grid';

/**
 * Cells a tower covers: `anchor` is the top-left cell, the footprint extends
 * `width` columns right and `height` rows down. Both default to one cell.
 */
export type TowerFootprint = {
  anchor: GridPoint;
  width?: number;
  height?: number;
};

export type BoardSnapshotRoute = {
  /** Shown in the header next to the route length. */
  label: string;
  sizeClass: RouteSizeClass;
  cells: readonly GridPoint[];
};

export type BoardSnapshotInput = {
  grid: GridModel;
  towers?: readonly TowerFootprint[];
  routes?: readonly BoardSnapshotRoute[];
};

function toCellIndex(grid: GridModel, point: GridPoint): number | null {
  const isInside = point.x >= 0 && point.x < grid.cols && point.y >= 0 && point.y < grid.rows;
  return isInside ? point.y * grid.cols + point.x : null;
}

function markBlockedCells(grid: GridModel, glyphs: BoardSnapshotGlyph[]): void {
  for (const cell of grid.cells) {
    const index = toCellIndex(grid, cell);
    if (index !== null && (cell.isOccupied || !cell.isWalkable)) {
      glyphs[index] = BoardSnapshotGlyph.TOWER;
    }
  }
}

function markTowerFootprints(
  grid: GridModel,
  towers: readonly TowerFootprint[],
  glyphs: BoardSnapshotGlyph[],
): void {
  for (const tower of towers) {
    const width = tower.width ?? DEFAULT_TOWER_FOOTPRINT_SIDE;
    const height = tower.height ?? DEFAULT_TOWER_FOOTPRINT_SIDE;
    for (let offsetY = 0; offsetY < height; offsetY += 1) {
      for (let offsetX = 0; offsetX < width; offsetX += 1) {
        const index = toCellIndex(grid, {
          x: tower.anchor.x + offsetX,
          y: tower.anchor.y + offsetY,
        });
        if (index !== null) {
          glyphs[index] = BoardSnapshotGlyph.TOWER;
        }
      }
    }
  }
}

function mergeRouteGlyph(
  current: BoardSnapshotGlyph,
  route: BoardSnapshotGlyph,
): BoardSnapshotGlyph {
  if (current === BoardSnapshotGlyph.FREE || current === route) {
    return route;
  }
  const isRouteGlyph =
    current === BoardSnapshotGlyph.SMALL_ROUTE ||
    current === BoardSnapshotGlyph.LARGE_ROUTE ||
    current === BoardSnapshotGlyph.OVERLAPPING_ROUTES;
  // Routes never overwrite towers, so a route drawn through a wall stays
  // visible as a wall and the bug shows up as a broken route line.
  return isRouteGlyph ? BoardSnapshotGlyph.OVERLAPPING_ROUTES : current;
}

function markRoutes(
  grid: GridModel,
  routes: readonly BoardSnapshotRoute[],
  glyphs: BoardSnapshotGlyph[],
): void {
  for (const route of routes) {
    const routeGlyph = BOARD_SNAPSHOT_ROUTE_GLYPH[route.sizeClass];
    for (const cell of route.cells) {
      const index = toCellIndex(grid, cell);
      if (index !== null) {
        glyphs[index] = mergeRouteGlyph(glyphs[index], routeGlyph);
      }
    }
  }
}

function markEndpoint(
  grid: GridModel,
  point: GridPoint,
  glyph: BoardSnapshotGlyph,
  glyphs: BoardSnapshotGlyph[],
): void {
  const index = toCellIndex(grid, point);
  if (index !== null) {
    glyphs[index] = glyph;
  }
}

function formatHeader(grid: GridModel, routes: readonly BoardSnapshotRoute[]): string {
  const routeParts = routes.map(
    (route) => `${route.label} (${route.sizeClass}) ${route.cells.length}`,
  );
  return [`board ${grid.cols}x${grid.rows}`, ...routeParts].join(' | ');
}

/**
 * Renders a battlefield as a multi-line string: a header with the board size
 * and every route length (in cells, entrance and exit included), then one
 * line per grid row. Pure and deterministic, so snapshots can be compared in
 * tests and printed by command line tools without a renderer.
 */
export function renderBoardSnapshot(input: BoardSnapshotInput): string {
  const { grid } = input;
  const towers = input.towers ?? [];
  const routes = input.routes ?? [];
  const glyphs = Array.from({ length: grid.cols * grid.rows }, () => BoardSnapshotGlyph.FREE);

  markBlockedCells(grid, glyphs);
  markTowerFootprints(grid, towers, glyphs);
  markRoutes(grid, routes, glyphs);
  markEndpoint(grid, grid.entrance, BoardSnapshotGlyph.ENTRANCE, glyphs);
  markEndpoint(grid, grid.exit, BoardSnapshotGlyph.EXIT, glyphs);

  const rows: string[] = [];
  for (let y = 0; y < grid.rows; y += 1) {
    rows.push(glyphs.slice(y * grid.cols, (y + 1) * grid.cols).join(''));
  }

  return [formatHeader(grid, routes), ...rows].join('\n');
}
