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
