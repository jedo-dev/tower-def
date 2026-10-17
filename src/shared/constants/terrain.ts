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
