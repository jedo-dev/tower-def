import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { createPlacedTowerSprite } from './battlefieldSpriteFactory';
import { getTowerAnimationSet } from '../animation/gameSceneAnimationRuntime';
import { PLACEHOLDER_TEXTURE_KEYS } from '../assets/placeholderTexture';
import { resolveBuildableTowerById, type BuildableTowerId } from '../../../../entities/tower';
import { TOWER_SPRITE_KEYS } from '../../../../shared/constants/sprites';
import { RaceId } from '../../../../shared/types/content-ids';

type SpriteStub = {
  textureKey: string;
  tint: number | undefined;
  played: string[];
};

function createSceneStub(registeredTextures: readonly string[]) {
  const sprites: SpriteStub[] = [];
  const scene = {
    textures: { exists: (key: string) => registeredTextures.includes(key) },
    add: {
      sprite: (_x: number, _y: number, textureKey: string) => {
        const record: SpriteStub = { textureKey, tint: undefined, played: [] };
        sprites.push(record);
        const sprite = {
          setDepth: () => sprite,
          setDisplaySize: () => sprite,
          setOrigin: () => sprite,
          setTint: (tint: number) => {
            record.tint = tint;
            return sprite;
          },
          play: (key: string) => {
            record.played.push(key);
            return sprite;
          },
          once: () => sprite,
        };
        return sprite;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, sprites };
}

function placed(buildableTowerId: BuildableTowerId) {
  const config = resolveBuildableTowerById(buildableTowerId);
  return { type: config.towerType, position: { x: 0, y: 0 }, buildableTowerId };
}

describe('createPlacedTowerSprite', () => {
  it('draws a tower from its own sheet, untinted, when the art is loaded', () => {
    const { scene, sprites } = createSceneStub([TOWER_SPRITE_KEYS.UNDEAD_FROST_WYRM_NEST]);

    const result = createPlacedTowerSprite(scene, placed('undead_frost_wyrm_nest'), RaceId.UNDEAD);

    expect(result.hasOwnArt).toBe(true);
    expect(sprites[0]).toEqual({
      textureKey: TOWER_SPRITE_KEYS.UNDEAD_FROST_WYRM_NEST,
      tint: undefined,
      played: [getTowerAnimationSet(TOWER_SPRITE_KEYS.UNDEAD_FROST_WYRM_NEST).build],
    });
  });

  it('keeps two towers of one attack kind apart', () => {
    const { scene, sprites } = createSceneStub([
      TOWER_SPRITE_KEYS.UNDEAD_PLAGUE,
      TOWER_SPRITE_KEYS.ORC_BURNING_PIT,
    ]);

    createPlacedTowerSprite(scene, placed('undead_plague_tower'), RaceId.UNDEAD);
    createPlacedTowerSprite(scene, placed('orc_burning_pit'), RaceId.ORC);

    expect(sprites.map((sprite) => sprite.textureKey)).toEqual([
      TOWER_SPRITE_KEYS.UNDEAD_PLAGUE,
      TOWER_SPRITE_KEYS.ORC_BURNING_PIT,
    ]);
  });

  it('falls back to borrowed art while a tower has no sheet', () => {
    const { scene, sprites } = createSceneStub([
      TOWER_SPRITE_KEYS.ELF_MOON_ARCHER,
      PLACEHOLDER_TEXTURE_KEYS.TOWER,
    ]);

    const result = createPlacedTowerSprite(scene, placed('elf_thorn_spire'), RaceId.ELF);

    expect(result.hasOwnArt).toBe(false);
    expect(sprites[0]?.textureKey).toBe(TOWER_SPRITE_KEYS.ELF_MOON_ARCHER);
  });

  it('falls back for a tower placed before content named it', () => {
    const { scene } = createSceneStub([TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]);
    const config = resolveBuildableTowerById('undead_bone_archer_tower');

    const result = createPlacedTowerSprite(
      scene,
      { type: config.towerType, position: { x: 0, y: 0 } },
      RaceId.UNDEAD,
    );

    expect(result.hasOwnArt).toBe(false);
  });
});
