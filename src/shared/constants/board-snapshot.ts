import { TowerTypeId } from '../types/content-ids';

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

/**
 * First character of a tower label on the board: the kind of tower standing
 * there. The plain single-target tower keeps the tower glyph, because that is
 * what maze walls are built from. None of these clash with route glyphs.
 */
export const BOARD_SNAPSHOT_TOWER_KIND_GLYPH: Readonly<Record<TowerTypeId, string>> = {
  [TowerTypeId.SINGLE]: BoardSnapshotGlyph.TOWER,
  [TowerTypeId.SPLASH]: 'S',
  [TowerTypeId.FROST]: 'F',
  [TowerTypeId.POISON]: 'P',
  [TowerTypeId.CHAIN]: 'C',
  [TowerTypeId.SUPPORT]: 'A',
};

/** Legend for boards drawn with tower labels. */
export const BOARD_SNAPSHOT_TOWER_LEGEND =
  'towers: # single (maze wall), S splash, F frost, P poison, C chain, A support; number = level';
