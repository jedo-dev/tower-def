import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PLACEHOLDER_DEFAULT_TINT,
  resolveSpriteKey,
  setMissingArtListener,
  type TextureLookup,
} from './spriteKeyResolver';
import { PLACEHOLDER_TEXTURE_KEYS } from './placeholderTexture';
import { UNIT_FACTION_TINTS } from '../../../../constants/sprites';
import { RaceId } from '../../../../types/content-ids';

function createTextures(registeredKeys: string[]): TextureLookup {
  return { exists: (key: string) => registeredKeys.includes(key) };
}

const PLACEHOLDERS = [PLACEHOLDER_TEXTURE_KEYS.UNIT, PLACEHOLDER_TEXTURE_KEYS.TOWER];

afterEach(() => {
  setMissingArtListener(undefined);
});

describe('resolveSpriteKey', () => {
  it('returns the real art when it is registered', () => {
    const textures = createTextures(['tower.undead.bone_archer', ...PLACEHOLDERS]);

    expect(resolveSpriteKey(textures, 'tower', 'tower.undead.bone_archer')).toEqual({
      spriteKey: 'tower.undead.bone_archer',
      isPlaceholder: false,
    });
  });

  it('falls back to the placeholder of the right kind', () => {
    const textures = createTextures(PLACEHOLDERS);

    expect(resolveSpriteKey(textures, 'tower', 'tower.orc.lightning_totem').spriteKey)
      .toBe(PLACEHOLDER_TEXTURE_KEYS.TOWER);
    expect(resolveSpriteKey(textures, 'unit', 'unit.orc.grunt').spriteKey)
      .toBe(PLACEHOLDER_TEXTURE_KEYS.UNIT);
  });

  it('tints the placeholder with the race that asked for it', () => {
    const textures = createTextures(PLACEHOLDERS);

    expect(
      resolveSpriteKey(textures, 'tower', 'tower.elf.thorn', { raceId: RaceId.ELF }).placeholderTint,
    ).toBe(UNIT_FACTION_TINTS[RaceId.ELF]);
    expect(resolveSpriteKey(textures, 'tower', 'tower.elf.thorn').placeholderTint)
      .toBe(PLACEHOLDER_DEFAULT_TINT);
  });

  it('never throws and never returns an empty key', () => {
    const textures = createTextures(PLACEHOLDERS);

    for (const requestedKey of ['', 'nonsense', 'unit.does.not.exist']) {
      const resolved = resolveSpriteKey(textures, 'unit', requestedKey);

      expect(resolved.spriteKey, requestedKey).not.toBe('');
      expect(resolved.isPlaceholder, requestedKey).toBe(true);
    }
  });

  it('hands back the requested key when even the placeholder is missing', () => {
    const textures = createTextures([]);

    expect(resolveSpriteKey(textures, 'unit', 'unit.orc.grunt')).toEqual({
      spriteKey: 'unit.orc.grunt',
      isPlaceholder: false,
    });
  });

  it('reports each fallback with the content behind it', () => {
    const textures = createTextures(PLACEHOLDERS);
    const listener = vi.fn();
    setMissingArtListener(listener);

    resolveSpriteKey(textures, 'tower', 'tower.orc.lightning_totem', {
      contentId: 'orc_lightning_totem',
    });
    resolveSpriteKey(textures, 'tower', PLACEHOLDER_TEXTURE_KEYS.TOWER);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      kind: 'tower',
      requestedKey: 'tower.orc.lightning_totem',
      contentId: 'orc_lightning_totem',
    });
  });
});
