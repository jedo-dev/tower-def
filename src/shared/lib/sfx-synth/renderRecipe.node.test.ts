import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readWavHeader } from './encodeWav';
import { envelopeLevel } from './renderLayer';
import { getRecipeDurationSec, renderSfxRecipe, renderSfxRecipeToWav } from './renderRecipe';
import { SFX_DEFAULT_PEAK, SFX_SAMPLE_RATE, type SfxRecipe } from './sfxRecipe.types';

/** Touches every waveform, filter type, sweep, modulation, drive and echo. */
const FIXTURE: SfxRecipe = {
  seed: 7,
  echo: { delaySec: 0.03, feedback: 0.3, mix: 0.3 },
  tailSec: 0.02,
  layers: [
    {
      waveform: 'saw',
      durationSec: 0.1,
      frequencyHz: 220,
      frequencyEndHz: 110,
      vibrato: { rateHz: 6, depth: 0.01 },
      drive: 1,
      envelope: { attackSec: 0.01, decaySec: 0.05, sustainLevel: 0.5, releaseSec: 0.02 },
      gain: 0.5,
      filters: [{ type: 'lowpass', cutoffHz: 2000, cutoffEndHz: 500, q: 1.2 }],
    },
    {
      waveform: 'square',
      startSec: 0.02,
      durationSec: 0.06,
      frequencyHz: 330,
      dutyCycle: 0.3,
      tremolo: { rateHz: 20, depth: 0.5 },
      envelope: { attackSec: 0, decaySec: 0.05, sustainLevel: 0, releaseSec: 0.01 },
      gain: 0.3,
      filters: [{ type: 'highpass', cutoffHz: 200 }],
    },
    {
      waveform: 'noise',
      durationSec: 0.05,
      frequencyHz: 3000,
      envelope: { attackSec: 0, decaySec: 0.04, sustainLevel: 0, releaseSec: 0.01 },
      gain: 0.4,
      filters: [{ type: 'bandpass', cutoffHz: 1500, q: 2 }],
    },
    {
      waveform: 'fm',
      startSec: 0.03,
      durationSec: 0.08,
      frequencyHz: 880,
      fm: { ratio: 2, index: 1.5, indexEnd: 0.1 },
      envelope: { attackSec: 0.002, decaySec: 0.07, sustainLevel: 0, releaseSec: 0.01 },
      gain: 0.3,
    },
    {
      waveform: 'triangle',
      durationSec: 0.04,
      frequencyHz: 440,
      envelope: { attackSec: 0.005, decaySec: 0, sustainLevel: 1, releaseSec: 0.02 },
      gain: 0.2,
    },
    {
      waveform: 'sine',
      durationSec: 0.04,
      frequencyHz: 100,
      frequencyEndHz: 50,
      sweepCurve: 0.5,
      envelope: { attackSec: 0.001, decaySec: 0.03, sustainLevel: 0, releaseSec: 0.01 },
      gain: 0.6,
    },
  ],
};

/**
 * Pinned output of FIXTURE. If this changes, every generated clip changes too:
 * re-run `npm run gen:sfx` and update the hash in the same commit.
 */
const FIXTURE_WAV_SHA256 = '3cd6a4e2f35890bdb92bdfe5fd6b93ca7a30fa0c21f487363d016cfdf65d7b86';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('renderSfxRecipe', () => {
  it('is deterministic: the same recipe renders the same bytes', () => {
    expect(sha256(renderSfxRecipeToWav(FIXTURE))).toBe(sha256(renderSfxRecipeToWav(FIXTURE)));
  });

  it('keeps a stable hash for a pinned recipe', () => {
    expect(sha256(renderSfxRecipeToWav(FIXTURE))).toBe(FIXTURE_WAV_SHA256);
  });

  it('takes a different noise take with a different seed', () => {
    const reseeded = { ...FIXTURE, seed: 8 };

    expect(sha256(renderSfxRecipeToWav(reseeded))).not.toBe(sha256(renderSfxRecipeToWav(FIXTURE)));
  });

  it('spans every layer plus the tail and stays under the peak ceiling', () => {
    const samples = renderSfxRecipe(FIXTURE);
    const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);

    expect(getRecipeDurationSec(FIXTURE)).toBeCloseTo(0.13, 5);
    expect(samples.length).toBe(Math.ceil(0.13 * SFX_SAMPLE_RATE));
    expect(peak).toBeLessThanOrEqual(SFX_DEFAULT_PEAK + 1e-9);
    expect(samples.every((sample) => Number.isFinite(sample))).toBe(true);
  });

  it('ends silent so no clip finishes on a click', () => {
    const samples = renderSfxRecipe(FIXTURE);

    expect(Math.abs(samples[samples.length - 1])).toBe(0);
  });

  it('writes mono 16-bit wav at the generator sample rate', () => {
    const wav = renderSfxRecipeToWav(FIXTURE);

    expect(readWavHeader(wav)).toEqual({
      channels: 1,
      sampleRate: SFX_SAMPLE_RATE,
      bitDepth: 16,
      dataBytes: wav.length - 44,
    });
  });
});

describe('envelopeLevel', () => {
  const envelope = { attackSec: 0.1, decaySec: 0.1, sustainLevel: 0.5, releaseSec: 0.1 };

  it('ramps up, settles on the sustain level and releases to zero', () => {
    expect(envelopeLevel(envelope, 0, 1)).toBe(0);
    expect(envelopeLevel(envelope, 0.1, 1)).toBeCloseTo(1, 5);
    expect(envelopeLevel(envelope, 0.5, 1)).toBe(0.5);
    expect(envelopeLevel(envelope, 1, 1)).toBe(0);
  });
});
