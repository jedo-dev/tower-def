import { describe, expect, it } from 'vitest';
import { SOUND_IDS } from '../../types/sound-ids';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS, SOUND_CLIPS } from './audio.constants';

describe('sound registry', () => {
  it('registers a clip for every sound id and nothing else', () => {
    expect(Object.keys(SOUND_CLIPS).sort()).toEqual([...SOUND_IDS].sort());
  });

  it('never lets two ids share a file; sharing belongs in the sound profiles', () => {
    const idsByPath = new Map<string, string[]>();
    for (const soundId of SOUND_IDS) {
      const path = SOUND_ASSET_PATHS[soundId];
      idsByPath.set(path, [...(idsByPath.get(path) ?? []), soundId]);
    }

    const shared = [...idsByPath.entries()].filter(([, ids]) => ids.length > 1);

    expect(shared).toEqual([]);
  });

  it('keeps every clip under the sfx root: generated sfx as WAV, ambience as OGG', () => {
    for (const soundId of SOUND_IDS) {
      const extension = soundId.startsWith('ambient.') ? 'ogg' : 'wav';
      expect(SOUND_ASSET_PATHS[soundId], soundId.toString()).toMatch(
        new RegExp(`^${SFX_ASSET_ROOT}/[a-z]+/.+\\.${extension}$`),
      );
    }
  });

  it('gives only the ambience a fallback container', () => {
    for (const soundId of SOUND_IDS) {
      const { fallbackAssetPath } = SOUND_CLIPS[soundId];
      if (soundId.startsWith('ambient.')) {
        expect(fallbackAssetPath, soundId).toMatch(
          new RegExp(`^${SFX_ASSET_ROOT}/ambient/.+\\.m4a$`),
        );
      } else {
        expect(fallbackAssetPath, soundId).toBeUndefined();
      }
    }
  });
});
