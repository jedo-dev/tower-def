import { RaceId } from '../types/content-ids';

export enum TerrainAssetKey {
  UNDEAD_TILESET = 'terrain.undead.tileset',
}

export const TERRAIN_TILESET_ASSET_PATHS: Record<TerrainAssetKey, string> = {
  [TerrainAssetKey.UNDEAD_TILESET]: '/assets/terrain/undead/undead_tileset.png',
};

export const TERRAIN_TILESET_FRAME = {
  width: 32,
  height: 32,
} as const;

export enum UndeadTerrainTileIndex {
  BASE_STONE_A = 0,
  BASE_STONE_B = 1,
  SKULL_DECORATION = 2,
  GREEN_NECROMANTIC_GLOW = 3,
  PURPLE_CORRUPTION = 4,
  DARK_CORRUPTION_EDGE = 5,
}

/** Which side of the board a painted side-scenery strip sits on. */
export type SideSceneryEdge = 'left' | 'right';

export type SideSceneryAsset = {
  readonly key: string;
  readonly path: string;
};

/**
 * Painted 3/4 top-down scenery strips framing the board, one pair per race.
 * The inner edge (the one touching the grid) is the organic border; the outer
 * edge fades to the scene background.
 */
export const TERRAIN_SIDE_SCENERY_ASSETS: Readonly<
  Record<RaceId, Readonly<Record<SideSceneryEdge, SideSceneryAsset>>>
> = {
  [RaceId.UNDEAD]: {
    left: { key: 'terrain.undead.side_left', path: '/assets/terrain/undead/side_left.webp' },
    right: { key: 'terrain.undead.side_right', path: '/assets/terrain/undead/side_right.webp' },
  },
  [RaceId.ORC]: {
    left: { key: 'terrain.orc.side_left', path: '/assets/terrain/orc/side_left.webp' },
    right: { key: 'terrain.orc.side_right', path: '/assets/terrain/orc/side_right.webp' },
  },
  [RaceId.HUMAN]: {
    left: { key: 'terrain.human.side_left', path: '/assets/terrain/human/side_left.webp' },
    right: { key: 'terrain.human.side_right', path: '/assets/terrain/human/side_right.webp' },
  },
  [RaceId.ELF]: {
    left: { key: 'terrain.elf.side_left', path: '/assets/terrain/elf/side_left.webp' },
    right: { key: 'terrain.elf.side_right', path: '/assets/terrain/elf/side_right.webp' },
  },
};
/**
 * The worn trail drawn along the shown creep route: a smooth ribbon through
 * the route's cell centres, textured with the race's path tile. Widths and
 * radii are in cells, the edge in world units (a cell is 16).
 */
export const PATH_RIBBON_STYLE = {
  widthCells: 0.88,
  cornerRadiusCells: 0.9,
  cornerSegments: 7,
  sampleSpacingCells: 0.25,
  widthNoiseAmplitude: 0.08,
  widthNoiseWavelengthCells: 1.5,
  edgeWidth: 1.25,
  edgeAlpha: 0.35,
  edgeColor: '#140f0a',
  /** Baked texture resolution: pixels per world unit. */
  texturePixelsPerWorldUnit: 3,
  textureKey: 'terrain:path-ribbon',
} as const;

/** A board edge an entrance or exit gate stands on. */
export type BoardEdge = 'top' | 'right' | 'bottom' | 'left';

/** What a gate marks: where creeps come in, or where they leave. */
export type GateRole = 'entrance' | 'exit';

/**
 * Painted faction gates (tower-def-alq): one 4x2 sheet per race. Row 0 is the
 * entrance, row 1 the exit; columns are the edge the gate stands on (the top
 * gate opens downwards, right leftwards, bottom upwards, left rightwards).
 * Frames keep the structure's base on their bottom edge.
 */
export const TERRAIN_GATE_SHEET = {
  frameWidth: 96,
  frameHeight: 96,
  columns: 4,
  /** Drawn width and height, in cells: the 2x2 endpoint footprint. */
  displaySizeCells: 2,
} as const;

export const TERRAIN_GATE_SHEET_COLUMN_BY_EDGE: Readonly<Record<BoardEdge, number>> = {
  top: 0,
  right: 1,
  bottom: 2,
  left: 3,
};

export const TERRAIN_GATE_SHEET_ROW_BY_ROLE: Readonly<Record<GateRole, number>> = {
  entrance: 0,
  exit: 1,
};

export const TERRAIN_GATE_ASSETS: Readonly<Record<RaceId, SideSceneryAsset>> = {
  [RaceId.UNDEAD]: { key: 'terrain.undead.gates', path: '/assets/terrain/undead/gates.png' },
  [RaceId.ORC]: { key: 'terrain.orc.gates', path: '/assets/terrain/orc/gates.png' },
  [RaceId.HUMAN]: { key: 'terrain.human.gates', path: '/assets/terrain/human/gates.png' },
  [RaceId.ELF]: { key: 'terrain.elf.gates', path: '/assets/terrain/elf/gates.png' },
};
