// Authored settings for the two ambience loops: where their sources live, how
// each loop is cut and how it is encoded. `tools/encode-ambient.ts` reads
// these; the asset tests hold the shipped files to the same budget.

import type { SoundId } from '../../types/sound-ids';

export type AmbientSoundId = Extract<SoundId, `ambient.${string}`>;

/** Full recordings the loops are cut from, relative to the repo root. */
export const AMBIENT_SOURCE_ROOT = 'assets-src/audio/ambient';

/** Both primary (OGG Vorbis) ambience files together. */
export const AMBIENT_SIZE_BUDGET_BYTES = 1_500_000;

/** Every source recording is authored at this rate; the loops keep it. */
export const AMBIENT_SAMPLE_RATE = 48_000;

export const AMBIENT_ENCODING = {
  /** libvorbis quality: 2 is ~96 kbps nominal for stereo. */
  VORBIS_QUALITY: 2,
  /** AAC-LC bitrate for the Safari / iOS fallback. */
  AAC_BITRATE: '96k',
} as const;

export type AmbientLoopSpec = {
  /** File under `AMBIENT_SOURCE_ROOT`. */
  sourceFile: string;
  /** Where the loop starts; must leave room for the crossfade before it. */
  loopStartSec: number;
  /** Preferred loop length; the cut lands where the music repeats best. */
  targetLoopSec: number;
  /** How far the loop end may move from the target. */
  searchRadiusSec: number;
  /** Window compared when searching for the loop end. */
  compareWindowSec: number;
  /** Tail blended into the pre-roll so the jump back is inaudible. */
  crossfadeSec: number;
};

export const AMBIENT_LOOP_SPECS: Record<AmbientSoundId, AmbientLoopSpec> = {
  'ambient.map': {
    sourceFile: 'ambient_map_01.mp3',
    loopStartSec: 30,
    targetLoopSec: 64,
    searchRadiusSec: 3,
    compareWindowSec: 1.5,
    crossfadeSec: 2,
  },
  'ambient.tension': {
    sourceFile: 'ambient_tension_01.mp3',
    loopStartSec: 20,
    targetLoopSec: 48,
    searchRadiusSec: 3,
    compareWindowSec: 1.5,
    crossfadeSec: 2,
  },
};
