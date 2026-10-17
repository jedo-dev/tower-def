import { describe, expect, it } from 'vitest';
import { SOUND_GROUP_IDS, SOUND_IDS, SOUND_IDS_BY_GROUP } from '../../types/sound-ids';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS, SOUND_CLIPS } from './audio.constants';

describe('sound registry', () => {
  it('registers a clip for every sound id and nothing else', () => {
    expect(Object.keys(SOUND_CLIPS).sort()).toEqual([...SOUND_IDS].sort());
  });

  it('declares every id in exactly one group file', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const group of SOUND_GROUP_IDS) {
      for (const soundId of SOUND_IDS_BY_GROUP[group]) {
        const owner = seen.get(soundId);
        if (owner !== undefined) {
          duplicates.push(`${soundId} in ${owner} and ${group}`);
        }
        seen.set(soundId, group);
      }
    }

    expect(duplicates).toEqual([]);
    expect(new Set(SOUND_IDS).size).toBe(SOUND_IDS.length);
  });

  it('names per-creature and per-tower ids by the documented scheme', () => {
    const perEntity = SOUND_IDS.filter(
      (soundId) => soundId.startsWith('combat.creep.') || soundId.startsWith('combat.tower.'),
    );

    for (const soundId of perEntity) {
      expect(soundId).toMatch(
        /^combat\.(creep\.[a-z_]+\.(hit|death|escape|spawn)|tower\.[a-z_]+\.(attack|impact|upgrade))$/,
      );
    }
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
