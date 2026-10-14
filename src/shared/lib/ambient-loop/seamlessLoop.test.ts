import { describe, expect, it } from 'vitest';
import {
  buildSeamlessLoop,
  findLoopLength,
  frameCount,
  measureLoopSeam,
  peakLevel,
  windowSimilarity,
  type PcmAudio,
} from './seamlessLoop';

const SAMPLE_RATE = 1000;

/** Stereo tone whose right channel is the left one at half level. */
function createTone(frames: number, periodFrames: number): PcmAudio {
  const samples = new Float32Array(frames * 2);
  for (let frame = 0; frame < frames; frame += 1) {
    const value = Math.sin((2 * Math.PI * frame) / periodFrames);
    samples[frame * 2] = value;
    samples[frame * 2 + 1] = value / 2;
  }
  return { samples, channels: 2, sampleRate: SAMPLE_RATE };
}

describe('windowSimilarity', () => {
  it('is 1 for identical windows and -1 for inverted ones', () => {
    const a = new Float32Array([0.5, -0.25, 0.75]);
    const inverted = a.map((value) => -value);

    expect(windowSimilarity(a, a)).toBeCloseTo(1);
    expect(windowSimilarity(a, inverted)).toBeCloseTo(-1);
  });

  it('is 0 when a window is silent', () => {
    expect(windowSimilarity(new Float32Array(3), new Float32Array([1, 2, 3]))).toBe(0);
  });
});

describe('findLoopLength', () => {
  it('snaps the loop end onto a whole number of periods', () => {
    const tone = createTone(2000, 40);

    const length = findLoopLength(tone, {
      startFrame: 100,
      targetLengthFrames: 1000 + 17,
      searchRadiusFrames: 30,
      compareWindowFrames: 80,
      coarseStepFrames: 5,
    });

    expect(length % 40).toBe(0);
    expect(Math.abs(length - 1017)).toBeLessThanOrEqual(30);
  });

  it('refuses a search window that runs past the recording', () => {
    const tone = createTone(500, 40);

    expect(() =>
      findLoopLength(tone, {
        startFrame: 100,
        targetLengthFrames: 600,
        searchRadiusFrames: 10,
        compareWindowFrames: 80,
        coarseStepFrames: 5,
      }),
    ).toThrow(/does not fit/);
  });
});

describe('buildSeamlessLoop', () => {
  it('keeps the requested length and channel layout', () => {
    const tone = createTone(2000, 40);

    const loop = buildSeamlessLoop(tone, 200, 800, 50);

    expect(frameCount(loop)).toBe(800);
    expect(loop.channels).toBe(2);
    expect(loop.sampleRate).toBe(SAMPLE_RATE);
  });

  it('leaves the part before the crossfade untouched', () => {
    const tone = createTone(2000, 40);

    const loop = buildSeamlessLoop(tone, 200, 800, 50);

    expect(Array.from(loop.samples.subarray(0, 1500))).toEqual(
      Array.from(tone.samples.subarray(400, 1900)),
    );
  });

  it('makes the boundary no harder than an ordinary sample step, even off-period', () => {
    const tone = createTone(2000, 40);
    // 17 frames off the period: a raw cut would click here.
    const rawCut: PcmAudio = {
      samples: tone.samples.slice(200 * 2, (200 + 817) * 2),
      channels: 2,
      sampleRate: SAMPLE_RATE,
    };
    const rawSeam = measureLoopSeam(rawCut);
    expect(rawSeam.seamJump).toBeGreaterThan(rawSeam.largestJump * 3);

    const loop = buildSeamlessLoop(tone, 200, 817, 100);
    const seam = measureLoopSeam(loop);

    expect(seam.seamJump).toBeLessThanOrEqual(seam.largestJump);
    expect(seam.largestJump).toBeLessThanOrEqual(seam.typicalJump * 2);
  });

  it('rejects a crossfade with no pre-roll to blend in', () => {
    const tone = createTone(500, 40);

    expect(() => buildSeamlessLoop(tone, 10, 100, 20)).toThrow(/before the loop start/);
    expect(() => buildSeamlessLoop(tone, 50, 10, 20)).toThrow(/longer than the loop/);
    expect(() => buildSeamlessLoop(tone, 50, 1000, 20)).toThrow(/past the end/);
  });
});

describe('peakLevel', () => {
  it('reports the loudest absolute sample', () => {
    expect(
      peakLevel({ samples: new Float32Array([0.1, -0.8, 0.3]), channels: 1, sampleRate: 1 }),
    ).toBeCloseTo(0.8);
  });
});
