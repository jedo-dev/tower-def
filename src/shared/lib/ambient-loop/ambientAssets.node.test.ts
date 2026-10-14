import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SFX_ASSET_ROOT, SOUND_CLIPS } from '../sound-registry/audio.constants';
import {
  AMBIENT_LOOP_SPECS,
  AMBIENT_SAMPLE_RATE,
  AMBIENT_SIZE_BUDGET_BYTES,
  AMBIENT_SOURCE_ROOT,
  type AmbientSoundId,
} from './ambientEncoding';
import { readOggStreamLength } from './oggStreamLength';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const PUBLIC_DIR = join(REPO_ROOT, 'public');
const AMBIENT_DIR = join(PUBLIC_DIR, SFX_ASSET_ROOT, 'ambient');
const AMBIENT_IDS = Object.keys(AMBIENT_LOOP_SPECS) as AmbientSoundId[];
const REENCODE_HINT = 'run `npm run encode:ambient` and commit the result';

describe('ambience assets', () => {
  it('ship every loop as OGG Vorbis with an AAC fallback', () => {
    for (const soundId of AMBIENT_IDS) {
      const clip = SOUND_CLIPS[soundId];
      expect(clip.assetPath, soundId).toMatch(/\.ogg$/);
      expect(clip.fallbackAssetPath, soundId).toMatch(/\.m4a$/);
      expect(existsSync(join(PUBLIC_DIR, clip.assetPath)), `${soundId} ${REENCODE_HINT}`).toBe(
        true,
      );
      expect(
        existsSync(join(PUBLIC_DIR, clip.fallbackAssetPath ?? '')),
        `${soundId} ${REENCODE_HINT}`,
      ).toBe(true);
    }
  });

  it('keep the source recordings out of the shipped bundle', () => {
    const shipped = readdirSync(AMBIENT_DIR);

    expect(shipped.filter((file) => !/\.(ogg|m4a)$/.test(file))).toEqual([]);
    for (const soundId of AMBIENT_IDS) {
      const source = join(REPO_ROOT, AMBIENT_SOURCE_ROOT, AMBIENT_LOOP_SPECS[soundId].sourceFile);
      expect(existsSync(source), source).toBe(true);
    }
  });

  it('stay under the size budget for the primary format', () => {
    const totalBytes = AMBIENT_IDS.reduce(
      (sum, soundId) => sum + statSync(join(PUBLIC_DIR, SOUND_CLIPS[soundId].assetPath)).size,
      0,
    );

    expect(totalBytes).toBeLessThan(AMBIENT_SIZE_BUDGET_BYTES);
  });

  it('declare a complete stream of the authored loop length', () => {
    for (const soundId of AMBIENT_IDS) {
      const bytes = readFileSync(join(PUBLIC_DIR, SOUND_CLIPS[soundId].assetPath));
      const { frames, isComplete } = readOggStreamLength(bytes);
      const spec = AMBIENT_LOOP_SPECS[soundId];
      const seconds = frames / AMBIENT_SAMPLE_RATE;

      expect(isComplete, soundId).toBe(true);
      expect(Math.abs(seconds - spec.targetLoopSec), soundId).toBeLessThanOrEqual(
        spec.searchRadiusSec,
      );
    }
  });
});
