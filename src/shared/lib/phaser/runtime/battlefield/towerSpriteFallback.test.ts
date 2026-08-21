import { describe, expect, it } from 'vitest';
import { getArcherTowerSpriteKey } from './battlefieldSpriteFactory';
import { PLACEHOLDER_TEXTURE_KEYS } from '../assets/placeholderTexture';
import { TOWER_SPRITE_KEYS } from '../../../../constants/sprites';
import { RaceId } from '../../../../types/content-ids';

/** Art that actually ships today, plus the runtime-drawn placeholders. */
const REGISTERED_TEXTURES = [
  TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER,
  TOWER_SPRITE_KEYS.ELF_MOON_ARCHER,
  PLACEHOLDER_TEXTURE_KEYS.UNIT,
  PLACEHOLDER_TEXTURE_KEYS.TOWER,
];

function createSceneStub(registeredTextures: string[] = REGISTERED_TEXTURES): Phaser.Scene {
  return {
    textures: { exists: (key: string) => registeredTextures.includes(key) },
  } as unknown as Phaser.Scene;
}

describe('tower sprite fallback', () => {
  it('uses the real sheet for races whose tower art exists', () => {
    const scene = createSceneStub();

    expect(getArcherTowerSpriteKey(scene, RaceId.UNDEAD)).toBe(TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER);
    expect(getArcherTowerSpriteKey(scene, RaceId.ELF)).toBe(TOWER_SPRITE_KEYS.ELF_MOON_ARCHER);
  });

  it('shows the placeholder for races whose tower art is still missing', () => {
    const scene = createSceneStub();

    expect(getArcherTowerSpriteKey(scene, RaceId.ORC)).toBe(PLACEHOLDER_TEXTURE_KEYS.TOWER);
    expect(getArcherTowerSpriteKey(scene, RaceId.HUMAN)).toBe(PLACEHOLDER_TEXTURE_KEYS.TOWER);
  });

  it('never returns an empty key, even with no textures at all', () => {
    const scene = createSceneStub([]);

    for (const race of [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN, RaceId.ELF]) {
      expect(getArcherTowerSpriteKey(scene, race), race).not.toBe('');
    }
  });
});
