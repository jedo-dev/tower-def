import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SOUND_IDS } from '../../types/sound-ids';
import { SFX_ASSET_ROOT, SOUND_ASSET_PATHS } from '../sound-registry/audio.constants';
import { readWavHeader } from './encodeWav';
import { GENERATED_SOUND_IDS, SFX_RECIPES } from './recipes';
import { renderSfxRecipeToWav } from './renderRecipe';
import { SFX_BIT_DEPTH, SFX_SAMPLE_RATE, SFX_SIZE_BUDGET_BYTES } from './sfxRecipe.types';

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

  it('stay inside the size budget', () => {
    const totalBytes = GENERATED_SOUND_IDS.reduce(
      (sum, soundId) => sum + readClip(soundId).length,
      0,
    );

    expect(totalBytes).toBeLessThan(SFX_SIZE_BUDGET_BYTES);
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
