import { BuilderFaction } from '../entities/builder-faction';

export type Faction = 'orc' | 'human' | 'elf' | 'undead';

export const TILES: Record<Faction, { ground: string; path: string }> = {
  orc: { ground: '/assets/tilesets/orc/ground.png', path: '/assets/tilesets/orc/path.png' },
  human: { ground: '/assets/tilesets/human/ground.png', path: '/assets/tilesets/human/path.png' },
  elf: { ground: '/assets/tilesets/elf/ground.png', path: '/assets/tilesets/elf/path.png' },
  undead: { ground: '/assets/tilesets/undead/ground.png', path: '/assets/tilesets/undead/path.png' },
};

export const PROPS: Record<Faction, string[]> = {
  orc: ['totem_skull', 'fire_pit', 'spike_barricade', 'volcanic_rocks'].map(
    (name) => `/assets/tilesets/orc/props/${name}.png`,
  ),
  human: ['barrel', 'lantern', 'hay_cart', 'mossy_rock'].map(
    (name) => `/assets/tilesets/human/props/${name}.png`,
  ),
  elf: ['glow_mushrooms', 'rune_stone', 'enchanted_stump', 'elf_fountain'].map(
    (name) => `/assets/tilesets/elf/props/${name}.png`,
  ),
  undead: ['gravestone', 'bone_pile', 'necro_cauldron', 'dead_tree'].map(
    (name) => `/assets/tilesets/undead/props/${name}.png`,
  ),
};

export function preloadTerrainAssets(): Promise<void[]> {
  const urls = [...Object.values(TILES).flatMap((tile) => [tile.ground, tile.path]), ...Object.values(PROPS).flat()];

  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = image.onerror = () => resolve();
          image.src = url;
        }),
    ),
  );
}

export function builderFactionToTerrainFaction(faction: BuilderFaction): Faction {
  if (faction === BuilderFaction.ORC) return 'orc';
  if (faction === BuilderFaction.HUMAN) return 'human';
  if (faction === BuilderFaction.ELF) return 'elf';
  return 'undead';
}

function hash(x: number, y: number, seed: number): number {
  let mixed = seed ^ x * 374761393 ^ y * 668265263;
  mixed = (mixed ^ (mixed >>> 13)) * 1274126177;
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 0xffffffff;
}

function factionSalt(faction: Faction): number {
  if (faction === 'orc') return 101;
  if (faction === 'human') return 211;
  if (faction === 'elf') return 307;
  return 401;
}

export function getPropForCell(
  x: number,
  y: number,
  faction: Faction,
  mapSeed: number,
  density = 0.08,
): string | null {
  const saltedSeed = mapSeed + factionSalt(faction);
  const randomValue = hash(x, y, saltedSeed);
  if (randomValue > density) {
    return null;
  }

  const list = PROPS[faction];
  const index = Math.floor(hash(x, y, saltedSeed + 1) * list.length);
  return list[index] ?? null;
}
