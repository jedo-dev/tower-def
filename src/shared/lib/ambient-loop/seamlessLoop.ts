// Pure math for cutting a seamless loop out of a longer recording. Works on
// interleaved PCM (any channel count) so `tools/encode-ambient.ts` can feed it
// what ffmpeg decodes and hand the result straight back for encoding.

/** Interleaved float PCM with its layout. */
export type PcmAudio = {
  samples: Float32Array;
  channels: number;
  sampleRate: number;
};

export type LoopSearchOptions = {
  /** Frame the loop starts at (and jumps back to). */
  startFrame: number;
  /** Preferred loop length, in frames; the search stays near it. */
  targetLengthFrames: number;
  /** How far from the target the end may move, in frames. */
  searchRadiusFrames: number;
  /** Length of the two windows compared for similarity, in frames. */
  compareWindowFrames: number;
  /** Coarse search step, in frames; the best hit is then refined per frame. */
  coarseStepFrames: number;
};

export type LoopSeamReport = {
  /** Largest per-channel jump between the loop's last and first frame. */
  seamJump: number;
  /** RMS of consecutive-sample jumps inside the loop: what a "normal" step is. */
  typicalJump: number;
  /** The biggest consecutive-sample jump anywhere inside the loop. */
  largestJump: number;
};

export function frameCount(audio: PcmAudio): number {
  return Math.floor(audio.samples.length / audio.channels);
}

/** Mono downmix of `length` frames starting at `startFrame`. */
function readMonoWindow(audio: PcmAudio, startFrame: number, length: number): Float32Array {
  const { samples, channels } = audio;
  const window = new Float32Array(length);
  for (let frame = 0; frame < length; frame += 1) {
    const base = (startFrame + frame) * channels;
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += samples[base + channel];
    }
    window[frame] = sum / channels;
  }
  return window;
}

/** Normalized cross-correlation of two equal-length windows, in [-1, 1]. */
export function windowSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let energyA = 0;
  let energyB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    energyA += a[index] * a[index];
    energyB += b[index] * b[index];
  }
  const norm = Math.sqrt(energyA * energyB);
  return norm === 0 ? 0 : dot / norm;
}

function similarityAtLength(
  audio: PcmAudio,
  reference: Float32Array,
  startFrame: number,
  lengthFrames: number,
): number {
  const candidate = readMonoWindow(audio, startFrame + lengthFrames, reference.length);
  return windowSimilarity(reference, candidate);
}

/**
 * Finds the loop length near the target whose end sounds most like the loop
 * start: the audio right after `start + length` should match the audio right
 * after `start`, so jumping back is inaudible. Deterministic.
 */
export function findLoopLength(audio: PcmAudio, options: LoopSearchOptions): number {
  const { startFrame, targetLengthFrames, searchRadiusFrames, compareWindowFrames } = options;
  const coarseStep = Math.max(1, options.coarseStepFrames);
  const totalFrames = frameCount(audio);
  const minLength = Math.max(compareWindowFrames, targetLengthFrames - searchRadiusFrames);
  const maxLength = Math.min(
    targetLengthFrames + searchRadiusFrames,
    totalFrames - startFrame - compareWindowFrames,
  );
  if (maxLength < minLength) {
    throw new Error('loop search window does not fit inside the recording');
  }

  const reference = readMonoWindow(audio, startFrame, compareWindowFrames);
  let bestLength = minLength;
  let bestScore = -Infinity;
  for (let length = minLength; length <= maxLength; length += coarseStep) {
    const score = similarityAtLength(audio, reference, startFrame, length);
    if (score > bestScore) {
      bestScore = score;
      bestLength = length;
    }
  }

  const refineFrom = Math.max(minLength, bestLength - coarseStep);
  const refineTo = Math.min(maxLength, bestLength + coarseStep);
  for (let length = refineFrom; length <= refineTo; length += 1) {
    const score = similarityAtLength(audio, reference, startFrame, length);
    if (score > bestScore) {
      bestScore = score;
      bestLength = length;
    }
  }
  return bestLength;
}

/**
 * Cuts `[startFrame, startFrame + lengthFrames)` and equal-power crossfades
 * its tail into the audio that precedes `startFrame`, so the last frame flows
 * into the first one exactly as the recording did. Needs `crossfadeFrames`
 * of audio before the start.
 */
export function buildSeamlessLoop(
  audio: PcmAudio,
  startFrame: number,
  lengthFrames: number,
  crossfadeFrames: number,
): PcmAudio {
  const { samples, channels, sampleRate } = audio;
  if (crossfadeFrames > startFrame) {
    throw new Error('not enough audio before the loop start for the crossfade');
  }
  if (crossfadeFrames > lengthFrames) {
    throw new Error('crossfade is longer than the loop');
  }
  if (startFrame + lengthFrames > frameCount(audio)) {
    throw new Error('loop runs past the end of the recording');
  }

  const loop = new Float32Array(lengthFrames * channels);
  loop.set(samples.subarray(startFrame * channels, (startFrame + lengthFrames) * channels));

  const fadeStart = lengthFrames - crossfadeFrames;
  const preRollStart = startFrame - crossfadeFrames;
  for (let fadeFrame = 0; fadeFrame < crossfadeFrames; fadeFrame += 1) {
    // Reaches 1 on the frame after the last one, so the final frame still
    // carries a sliver of the tail and the pre-roll lands exactly at start.
    const progress = (fadeFrame + 1) / (crossfadeFrames + 1);
    const inGain = Math.sin((progress * Math.PI) / 2);
    const outGain = Math.cos((progress * Math.PI) / 2);
    const loopBase = (fadeStart + fadeFrame) * channels;
    const preRollBase = (preRollStart + fadeFrame) * channels;
    for (let channel = 0; channel < channels; channel += 1) {
      loop[loopBase + channel] =
        loop[loopBase + channel] * outGain + samples[preRollBase + channel] * inGain;
    }
  }

  return { samples: loop, channels, sampleRate };
}

/** How hard the loop boundary hits compared with an ordinary sample step. */
export function measureLoopSeam(audio: PcmAudio): LoopSeamReport {
  const { samples, channels } = audio;
  const frames = frameCount(audio);
  if (frames < 2) {
    return { seamJump: 0, typicalJump: 0, largestJump: 0 };
  }

  let seamJump = 0;
  const lastBase = (frames - 1) * channels;
  for (let channel = 0; channel < channels; channel += 1) {
    seamJump = Math.max(seamJump, Math.abs(samples[lastBase + channel] - samples[channel]));
  }

  let squaredSum = 0;
  let largestJump = 0;
  for (let index = channels; index < frames * channels; index += 1) {
    const step = Math.abs(samples[index] - samples[index - channels]);
    squaredSum += step * step;
    largestJump = Math.max(largestJump, step);
  }
  const typicalJump = Math.sqrt(squaredSum / ((frames - 1) * channels));
  return { seamJump, typicalJump, largestJump };
}

/** Peak absolute sample value. */
export function peakLevel(audio: PcmAudio): number {
  let peak = 0;
  for (let index = 0; index < audio.samples.length; index += 1) {
    peak = Math.max(peak, Math.abs(audio.samples[index]));
  }
  return peak;
}
