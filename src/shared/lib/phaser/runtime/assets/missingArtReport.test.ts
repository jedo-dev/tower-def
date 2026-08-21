import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMissingArtReport,
  getMissingArtReport,
  startMissingArtReport,
  stopMissingArtReport,
} from './missingArtReport';
import { resolveSpriteKey, type TextureLookup } from './spriteKeyResolver';
import { PLACEHOLDER_TEXTURE_KEYS } from './placeholderTexture';

const TEXTURES: TextureLookup = {
  exists: (key: string) =>
    key === 'tower.undead.bone_archer'
    || key === PLACEHOLDER_TEXTURE_KEYS.TOWER
    || key === PLACEHOLDER_TEXTURE_KEYS.UNIT,
};

afterEach(() => {
  stopMissingArtReport();
  clearMissingArtReport();
  vi.restoreAllMocks();
});

describe('missing art report', () => {
  it('lists a missing key once with the content that referenced it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: true });

    resolveSpriteKey(TEXTURES, 'tower', 'tower.orc.lightning_totem', {
      contentId: 'orc_lightning_totem',
    });
    resolveSpriteKey(TEXTURES, 'tower', 'tower.orc.lightning_totem', {
      contentId: 'orc_lightning_totem',
    });
    resolveSpriteKey(TEXTURES, 'tower', 'tower.orc.lightning_totem', {
      contentId: 'orc_burning_pit',
    });

    expect(getMissingArtReport()).toEqual([
      {
        kind: 'tower',
        requestedKey: 'tower.orc.lightning_totem',
        contentIds: ['orc_lightning_totem', 'orc_burning_pit'],
      },
    ]);
  });

  it('separates missing keys by sprite kind', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: true });

    resolveSpriteKey(TEXTURES, 'tower', 'tower.human.cannon');
    resolveSpriteKey(TEXTURES, 'unit', 'unit.human.footman');

    expect(getMissingArtReport().map((entry) => `${entry.kind}:${entry.requestedKey}`)).toEqual([
      'tower:tower.human.cannon',
      'unit:unit.human.footman',
    ]);
  });

  it('says nothing about art that exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: true });

    resolveSpriteKey(TEXTURES, 'tower', 'tower.undead.bone_archer');

    expect(getMissingArtReport()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once per missing key, not once per lookup', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: true });

    resolveSpriteKey(TEXTURES, 'tower', 'tower.elf.thorn');
    resolveSpriteKey(TEXTURES, 'tower', 'tower.elf.thorn');
    resolveSpriteKey(TEXTURES, 'tower', 'tower.elf.thorn');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('tower.elf.thorn');
  });

  it('collects and logs nothing outside development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: false });

    resolveSpriteKey(TEXTURES, 'tower', 'tower.orc.lightning_totem');

    expect(getMissingArtReport()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stops collecting once the scene shuts down', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    startMissingArtReport({ isDevelopment: true });
    stopMissingArtReport();

    resolveSpriteKey(TEXTURES, 'tower', 'tower.orc.lightning_totem');

    expect(getMissingArtReport()).toEqual([]);
  });
});
