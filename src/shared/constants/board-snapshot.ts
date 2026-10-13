/**
 * Glyphs of the ASCII board snapshot. One character per grid cell, so a
 * snapshot reads as a plain text grid in test output, CLI logs and diffs.
 */
export enum BoardSnapshotGlyph {
  FREE = '.',
  TOWER = '#',
  SMALL_ROUTE = 's',
  LARGE_ROUTE = 'L',
  OVERLAPPING_ROUTES = '*',
  ENTRANCE = 'E',
  EXIT = 'X',
}

/** Creep size classes a route can be walked by. */
export enum RouteSizeClass {
  SMALL = 'small',
  LARGE = 'large',
}

export const BOARD_SNAPSHOT_ROUTE_GLYPH: Readonly<Record<RouteSizeClass, BoardSnapshotGlyph>> = {
  [RouteSizeClass.SMALL]: BoardSnapshotGlyph.SMALL_ROUTE,
  [RouteSizeClass.LARGE]: BoardSnapshotGlyph.LARGE_ROUTE,
};

/** Footprint side used when a tower does not state its own size. */
export const DEFAULT_TOWER_FOOTPRINT_SIDE = 1;
