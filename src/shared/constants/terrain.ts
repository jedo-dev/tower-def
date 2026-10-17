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
