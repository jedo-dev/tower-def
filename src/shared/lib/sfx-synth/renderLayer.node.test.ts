import { describe, expect, it } from 'vitest';
import { renderLayerInto } from './renderLayer';
import { createSeededRandom } from './seededRandom';
import { SFX_SAMPLE_RATE, type SfxLayer } from './sfxRecipe.types';

const FLAT = { attackSec: 0.002, decaySec: 0, sustainLevel: 1, releaseSec: 0.002 };

function render(layer: SfxLayer, seed = 1): Float64Array {
  const output = new Float64Array(Math.ceil(layer.durationSec * SFX_SAMPLE_RATE));
  renderLayerInto(output, layer, SFX_SAMPLE_RATE, createSeededRandom(seed));
  return output;
}

/** Magnitude of one frequency (Goertzel), normalized by length. */
function magnitudeAt(samples: Float64Array, frequencyHz: number): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequencyHz) / SFX_SAMPLE_RATE);
  let previous = 0;
  let beforePrevious = 0;
  for (const sample of samples) {
    const current = sample + coefficient * previous - beforePrevious;
    beforePrevious = previous;
    previous = current;
  }
  const power = previous * previous + beforePrevious * beforePrevious;
  return Math.sqrt(power - coefficient * previous * beforePrevious) / samples.length;
}

/** Periods (in samples) between upward zero crossings inside [from, to). */
function periods(samples: Float64Array, fromSec: number, toSec: number): number[] {
  const crossings: number[] = [];
  const end = Math.min(samples.length, Math.round(toSec * SFX_SAMPLE_RATE));
  for (let index = Math.round(fromSec * SFX_SAMPLE_RATE) + 1; index < end; index += 1) {
    if (samples[index - 1] < 0 && samples[index] >= 0) {
      crossings.push(index);
    }
  }
  return crossings.slice(1).map((crossing, index) => crossing - crossings[index]);
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

const SINE: SfxLayer = {
  waveform: 'sine',
  durationSec: 1,
  frequencyHz: 1000,
  envelope: FLAT,
  gain: 1,
};

describe('renderLayerInto voice features', () => {
  it('shapes a saw with a formant bank: the formant band outweighs the low harmonics', () => {
    const saw: SfxLayer = { ...SINE, waveform: 'saw', frequencyHz: 110, durationSec: 0.5 };
    const raw = render(saw);
    const voiced = render({ ...saw, formants: [{ frequencyHz: 880, q: 8, gain: 1 }] });

    // A raw saw falls off as 1/n, so the 8th harmonic is far below the 2nd.
    expect(magnitudeAt(raw, 880)).toBeLessThan(magnitudeAt(raw, 220));
    expect(magnitudeAt(voiced, 880)).toBeGreaterThan(magnitudeAt(voiced, 220) * 3);
  });

  it('glides a formant along its sweep', () => {
    const noise: SfxLayer = {
      ...SINE,
      waveform: 'noise',
      frequencyHz: SFX_SAMPLE_RATE,
      formants: [{ frequencyHz: 500, frequencyEndHz: 2000, q: 10, gain: 1 }],
    };
    const samples = render(noise);
    const head = samples.subarray(0, SFX_SAMPLE_RATE / 5);
    const tail = samples.subarray(samples.length - SFX_SAMPLE_RATE / 5);

    expect(magnitudeAt(head, 500)).toBeGreaterThan(magnitudeAt(head, 2000));
    expect(magnitudeAt(tail, 2000)).toBeGreaterThan(magnitudeAt(tail, 500));
  });

  it('widens the vibrato towards depthEnd', () => {
    const samples = render({
      ...SINE,
      frequencyHz: 200,
      vibrato: { rateHz: 5, depth: 0.005, depthEnd: 0.08 },
    });

    expect(spread(periods(samples, 0.8, 1))).toBeGreaterThan(spread(periods(samples, 0, 0.2)) * 4);
  });

  it('renders a depthEnd equal to depth exactly like a steady vibrato', () => {
    const steady = render({ ...SINE, vibrato: { rateHz: 5, depth: 0.03 } });
    const swept = render({ ...SINE, vibrato: { rateHz: 5, depth: 0.03, depthEnd: 0.03 } });

    expect(swept).toEqual(steady);
  });

  it('drifts the pitch with seeded jitter, within its depth', () => {
    const jittered: SfxLayer = { ...SINE, jitter: { rateHz: 8, depth: 0.05 } };
    const samples = render(jittered, 3);
    const lengths = periods(samples, 0, 1);
    const nominal = SFX_SAMPLE_RATE / 1000;

    expect(render(jittered, 3)).toEqual(samples);
    expect(render(jittered, 4)).not.toEqual(samples);
    expect(spread(lengths)).toBeGreaterThan(spread(periods(render(SINE), 0, 1)));
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(Math.floor(nominal / 1.05) - 1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(Math.ceil(nominal / 0.95) + 1);
  });
});
