import {
  SFX_SAMPLE_RATE,
  type SfxEnvelope,
  type SfxFilter,
  type SfxLayer,
} from '../sfxRecipe.types';

/**
 * Shorthands for writing recipes. Every helper returns plain layer data, so a
 * recipe stays a readable list of sound layers.
 */

/** The palette sits around D minor, dark even on victory (a held D over timpani). */
export const NOTE = {
  D2: 73.42,
  A2: 110,
  D3: 146.83,
  Eb3: 155.56,
  F3: 174.61,
  G3: 196,
  A3: 220,
  D4: 293.66,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392,
  A4: 440,
  C5: 523.25,
  D5: 587.33,
  A5: 880,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  A6: 1760,
} as const;

/** Hold rate that makes `noise` plain white noise. */
export const WHITE = SFX_SAMPLE_RATE;

/** Instant attack, then a fall to silence: plucks, knocks, clicks. */
export function hit(decaySec: number, attackSec = 0.002): SfxEnvelope {
  return { attackSec, decaySec, sustainLevel: 0, releaseSec: 0.01 };
}

/** Rises, holds at `sustainLevel` and fades out over `releaseSec`. */
export function swell(attackSec: number, releaseSec: number, sustainLevel = 1): SfxEnvelope {
  return { attackSec, decaySec: 0, sustainLevel, releaseSec };
}

/** Accent then settle: horns, breath, pads. */
export function shaped(
  attackSec: number,
  decaySec: number,
  sustainLevel: number,
  releaseSec: number,
): SfxEnvelope {
  return { attackSec, decaySec, sustainLevel, releaseSec };
}

export const lowpass = (cutoffHz: number, cutoffEndHz?: number, q?: number): SfxFilter => ({
  type: 'lowpass',
  cutoffHz,
  ...(cutoffEndHz === undefined ? {} : { cutoffEndHz }),
  ...(q === undefined ? {} : { q }),
});

export const highpass = (cutoffHz: number, cutoffEndHz?: number, q?: number): SfxFilter => ({
  type: 'highpass',
  cutoffHz,
  ...(cutoffEndHz === undefined ? {} : { cutoffEndHz }),
  ...(q === undefined ? {} : { q }),
});

export const bandpass = (cutoffHz: number, cutoffEndHz?: number, q = 1): SfxFilter => ({
  type: 'bandpass',
  cutoffHz,
  ...(cutoffEndHz === undefined ? {} : { cutoffEndHz }),
  q,
});

/** FM chime: bright strike that mellows as the modulation decays. */
export function bell(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
  options: { ratio?: number; index?: number; attackSec?: number } = {},
): SfxLayer {
  return {
    waveform: 'fm',
    startSec,
    durationSec,
    frequencyHz,
    fm: { ratio: options.ratio ?? 3, index: options.index ?? 1.6, indexEnd: 0.1 },
    envelope: hit(durationSec * 0.95, options.attackSec ?? 0.002),
    gain,
  };
}

/** Pitched-down sine: drum skins, body hits, stone knocks. */
export function thump(
  startSec: number,
  fromHz: number,
  toHz: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    sweepCurve: 0.5,
    envelope: hit(durationSec * 0.92),
    gain,
  };
}

/** Short percussive noise; a low `holdHz` crunches like bone or gravel. */
export function burst(
  startSec: number,
  durationSec: number,
  gain: number,
  filters: SfxFilter[],
  holdHz: number = WHITE,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: holdHz,
    envelope: hit(durationSec * 0.9),
    gain,
    filters,
  };
}
