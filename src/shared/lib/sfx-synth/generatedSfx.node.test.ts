import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SOUND_GROUP_IDS, SOUND_IDS, SOUND_IDS_BY_GROUP } from '../../types/sound-ids';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS } from '../sound-registry/audio.constants';
import { readWavHeader } from './encodeWav';
import { GENERATED_SOUND_IDS, SFX_RECIPES, getGeneratedSoundIdsOfGroup } from './recipes';
import { renderSfxRecipeToWav } from './renderRecipe';
import { SFX_BIT_DEPTH, SFX_SAMPLE_RATE } from './sfxRecipe.types';
import { SFX_GROUP_BUDGET_BYTES, SFX_TOTAL_BUDGET_BYTES, getSfxGroupOfFile } from './sfxGroups';

const PUBLIC_DIR = fileURLToPath(new URL('../../../../public', import.meta.url));
const SFX_DIR = join(PUBLIC_DIR, SFX_ASSET_ROOT);
const REGENERATE_HINT = 'run `npm run gen:sfx` and commit the result';

function readClip(soundId: (typeof GENERATED_SOUND_IDS)[number]): Uint8Array {
  return new Uint8Array(readFileSync(join(PUBLIC_DIR, SOUND_ASSET_PATHS[soundId])));
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function listWavFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return listWavFiles(fullPath);
    }
    return entry.endsWith('.wav') ? [fullPath] : [];
  });
}

describe('generated sound effects', () => {
  it('generate every registered sound except the authored ambience', () => {
    const nonAmbient = SOUND_IDS.filter((soundId) => !soundId.startsWith('ambient.'));

    expect([...GENERATED_SOUND_IDS].sort()).toEqual([...nonAmbient].sort());
  });

  it('resolve every registered non-ambient sound to an existing file', () => {
    const missing = GENERATED_SOUND_IDS.filter(
      (soundId) => !existsSync(join(PUBLIC_DIR, SOUND_ASSET_PATHS[soundId])),
    );

    expect(missing, REGENERATE_HINT).toEqual([]);
  });

  it('match their recipes byte for byte, so the generator is deterministic and current', () => {
    const stale = GENERATED_SOUND_IDS.filter(
      (soundId) => sha256(readClip(soundId)) !== sha256(renderSfxRecipeToWav(SFX_RECIPES[soundId])),
    );

    expect(stale, REGENERATE_HINT).toEqual([]);
  });

  it('are mono 16-bit at the generator sample rate', () => {
    for (const soundId of GENERATED_SOUND_IDS) {
      const header = readWavHeader(readClip(soundId));

      expect(header, soundId).toMatchObject({
        channels: 1,
        bitDepth: SFX_BIT_DEPTH,
        sampleRate: SFX_SAMPLE_RATE,
      });
    }
  });

  it('stay inside the size budget of their group and in total', () => {
    let totalBytes = 0;

    for (const group of SOUND_GROUP_IDS) {
      const groupBytes = getGeneratedSoundIdsOfGroup(group).reduce(
        (sum, soundId) => sum + readClip(soundId).length,
        0,
      );
      totalBytes += groupBytes;

      expect(groupBytes, group).toBeLessThan(SFX_GROUP_BUDGET_BYTES[group]);
    }

    expect(totalBytes).toBeLessThan(SFX_TOTAL_BUDGET_BYTES);
  });

  it('render each group from the recipes of its own ids', () => {
    for (const group of SOUND_GROUP_IDS) {
      const generated = SOUND_IDS_BY_GROUP[group].filter((id) => !id.startsWith('ambient.'));

      expect([...getGeneratedSoundIdsOfGroup(group)].sort(), group).toEqual([...generated].sort());
    }
  });

  it('keep race clips under combat/<race>/ and core clips outside every race folder', () => {
    for (const group of SOUND_GROUP_IDS) {
      for (const soundId of getGeneratedSoundIdsOfGroup(group)) {
        const relativePath = SOUND_ASSET_PATHS[soundId].slice(SFX_ASSET_ROOT.length + 1);

        expect(getSfxGroupOfFile(relativePath), soundId).toBe(group);
      }
    }
  });

  it('leave no orphaned wav next to them', () => {
    const registered = new Set(
      Object.values(SOUND_ASSET_PATHS).map((path) => join(PUBLIC_DIR, path)),
    );
    const orphans = listWavFiles(SFX_DIR).filter((file) => !registered.has(file));

    expect(orphans).toEqual([]);
  });

  it('keep the two authored ambience loops in place', () => {
    expect(existsSync(join(PUBLIC_DIR, SOUND_ASSET_PATHS['ambient.map']))).toBe(true);
    expect(existsSync(join(PUBLIC_DIR, SOUND_ASSET_PATHS['ambient.tension']))).toBe(true);
  });
});
