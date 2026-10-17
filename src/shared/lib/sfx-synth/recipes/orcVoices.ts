import { SFX_SAMPLE_RATE, type SfxFormant, type SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';

/**
 * Orc voices: a glottal source (saw or triangle) through the layer's formant
 * bank, with optional breath (white noise) and rasp (sample-and-hold noise at
 * the pitch, which buzzes hoarsely) through the same bank. A pitch contour is a
 * chain of segments: each sweeps between two points and crossfades into the
 * next at a sample where both sources are in phase, so rise-then-fall glides
 * stay smooth. The voiced source carries no `jitter`: its seeded drift could
 * not be mirrored when the segments are phase-aligned.
 */

/** One resonance of the vocal tract; `gain` compensates the source's roll-off. */
export type Formant = { hz: number; q: number; gain: number };

/** A vowel is its formants, low to high. Every vowel of one voice has the same count. */
export type Vowel = readonly Formant[];

/** Pitch, loudness and vowel at a moment of the utterance. */
export type VoicePoint = { atSec: number; hz: number; level: number; vowel: Vowel };

export type VoiceTimbre = {
  source: 'saw' | 'triangle';
  /** Soft saturation of the source; keep it low, it brightens. */
  drive?: number;
  /** Slow pitch wobble; the rate is rounded so each segment holds whole cycles. */
  vibrato?: { rateHz: number; depth: number };
  /** Amplitude flutter: a growl or a sob. */
  tremolo?: { rateHz: number; depth: number };
  /** White noise through the formants, relative to the voiced level. */
  breath?: number;
  /** Pitch-rate sample-and-hold noise through the formants: hoarseness. */
  rasp?: number;
  /** Source an octave below through the first formant: fry, chest weight. */
  subharmonic?: number;
  /** Final smoothing so no source edge sounds square. */
  lowpassHz: number;
  attackSec: number;
  releaseSec: number;
};

/** Length of the crossfade between two pitch segments. */
const SEGMENT_OVERLAP_SEC = 0.02;
const TWO_PI = Math.PI * 2;

function toSampleSec(timeSec: number): number {
  return Math.round(timeSec * SFX_SAMPLE_RATE) / SFX_SAMPLE_RATE;
}

/** Vibrato rate rounded to whole cycles over the segment, so segments join at rest. */
function wholeCycleVibrato(
  vibrato: VoiceTimbre['vibrato'],
  durationSec: number,
): VoiceTimbre['vibrato'] {
  if (!vibrato) {
    return undefined;
  }
  const cycles = Math.max(1, Math.round(vibrato.rateHz * durationSec));
  return { rateHz: cycles / durationSec, depth: vibrato.depth };
}

/**
 * Latest sample at or before `targetIndex` where a source started at sample 0
 * wraps its phase: a segment started there begins in phase with this one.
 * Mirrors the oscillator of `renderLayer.ts`.
 */
function phaseAlignedIndex(layer: SfxLayer, targetIndex: number): number {
  const length = Math.round(layer.durationSec * SFX_SAMPLE_RATE);
  const endHz = layer.frequencyEndHz ?? layer.frequencyHz;
  let phase = 0;
  let lastWrap = 0;
  for (let index = 0; index <= targetIndex; index += 1) {
    const progress = index / (length - 1);
    const curve = Math.pow(progress, layer.sweepCurve ?? 1);
    let frequency = layer.frequencyHz * Math.pow(endHz / layer.frequencyHz, curve);
    if (layer.vibrato) {
      const timeSec = index / SFX_SAMPLE_RATE;
      frequency *= 1 + layer.vibrato.depth * Math.sin(TWO_PI * layer.vibrato.rateHz * timeSec);
    }
    if (phase < frequency / SFX_SAMPLE_RATE) {
      lastWrap = index;
    }
    phase += frequency / SFX_SAMPLE_RATE;
    phase -= Math.floor(phase);
  }
  return lastWrap;
}

type Segment = { startSec: number; endSec: number; from: VoicePoint; to: VoicePoint };

function formantBank(from: Vowel, to: Vowel, qScale = 1): SfxFormant[] {
  return from.map((formant, index) => {
    const endHz = to[index].hz;
    return {
      frequencyHz: formant.hz,
      ...(endHz === formant.hz ? {} : { frequencyEndHz: endHz }),
      q: formant.q * qScale,
      gain: formant.gain,
    };
  });
}

/** Unsteady hold rate that makes the rasp sound torn rather than buzzing. */
const RASP_JITTER = { rateHz: 45, depth: 0.12 };

/** All layers of one segment: voiced formants plus breath, rasp and fry. */
function segmentLayers(
  segment: Segment,
  timbre: VoiceTimbre,
  gain: number,
  isFirst: boolean,
  isLast: boolean,
): SfxLayer[] {
  const { from, to } = segment;
  const durationSec = segment.endSec - segment.startSec;
  const attackSec = isFirst ? timbre.attackSec : SEGMENT_OVERLAP_SEC;
  const releaseSec = isLast ? timbre.releaseSec : SEGMENT_OVERLAP_SEC;
  const peak = Math.max(from.level, to.level);
  const segmentGain = gain * peak;
  const filters = [lowpass(timbre.lowpassHz)];
  const voiced: SfxLayer = {
    waveform: timbre.source,
    startSec: segment.startSec,
    durationSec,
    frequencyHz: from.hz,
    frequencyEndHz: to.hz,
    vibrato: wholeCycleVibrato(timbre.vibrato, durationSec),
    tremolo: timbre.tremolo,
    drive: timbre.drive,
    envelope: shaped(attackSec, durationSec - attackSec, to.level / peak, releaseSec),
    gain: segmentGain,
    formants: formantBank(from.vowel, to.vowel),
    filters,
  };
  const noise = (holdHz: number, holdEndHz: number, share: number): SfxLayer => ({
    ...voiced,
    waveform: 'noise',
    frequencyHz: holdHz,
    frequencyEndHz: holdEndHz,
    vibrato: undefined,
    drive: undefined,
    gain: segmentGain * share,
    formants: formantBank(from.vowel, to.vowel, 0.7),
  });

  return [
    voiced,
    ...(timbre.breath ? [noise(WHITE, WHITE, timbre.breath)] : []),
    ...(timbre.rasp ? [{ ...noise(from.hz, to.hz, timbre.rasp), jitter: RASP_JITTER }] : []),
    ...(timbre.subharmonic
      ? [
          {
            ...voiced,
            frequencyHz: from.hz / 2,
            frequencyEndHz: to.hz / 2,
            gain: segmentGain * timbre.subharmonic,
            formants: formantBank(from.vowel.slice(0, 1), to.vowel.slice(0, 1)),
          },
        ]
      : []),
  ];
}

/**
 * A voiced utterance following `points` (at least two, times relative to
 * `startSec`). Pitch and formants glide between points; loudness holds or
 * falls towards the next point.
 */
export function sing(
  startSec: number,
  points: readonly VoicePoint[],
  timbre: VoiceTimbre,
  gain: number,
): SfxLayer[] {
  const layers: SfxLayer[] = [];
  let segmentStartSec = toSampleSec(startSec + points[0].atSec);

  for (let index = 0; index < points.length - 1; index += 1) {
    const isLast = index === points.length - 2;
    const boundarySec = startSec + points[index + 1].atSec;
    const endSec = toSampleSec(isLast ? boundarySec : boundarySec + SEGMENT_OVERLAP_SEC);
    const segment = {
      startSec: segmentStartSec,
      endSec,
      from: points[index],
      to: points[index + 1],
    };
    const segmentLayerList = segmentLayers(segment, timbre, gain, index === 0, isLast);
    layers.push(...segmentLayerList);

    if (!isLast) {
      const boundaryIndex = Math.round((boundarySec - segmentStartSec) * SFX_SAMPLE_RATE);
      const alignedIndex = phaseAlignedIndex(segmentLayerList[0], boundaryIndex);
      segmentStartSec = toSampleSec(segmentStartSec + alignedIndex / SFX_SAMPLE_RATE);
    }
  }
  return layers;
}

/** Shorthand for a voice point. */
export function at(atSec: number, hz: number, level: number, vowel: Vowel): VoicePoint {
  return { atSec, hz, level, vowel };
}

/** Same vowel with every formant moved by `ratio`: a smaller or larger throat. */
export function scaleVowel(vowel: Vowel, ratio: number): Vowel {
  return vowel.map((formant) => ({ ...formant, hz: formant.hz * ratio }));
}

/** Breathy nasal blast: a snort or a sniff. */
export function snort(startSec: number, durationSec: number, gain: number): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec,
      frequencyHz: WHITE,
      envelope: shaped(0.006, durationSec * 0.6, 0.15, durationSec * 0.3),
      gain,
      filters: [bandpass(1100, 650, 1.6), lowpass(3000)],
    },
    {
      waveform: 'noise',
      startSec,
      durationSec: durationSec * 0.7,
      frequencyHz: 180,
      envelope: hit(durationSec * 0.6, 0.004),
      gain: gain * 0.6,
      filters: [bandpass(320, undefined, 2)],
    },
  ];
}

/** Water bubbling in a throat: a run of small rising sine chirps. */
export function bubbles(
  startSec: number,
  count: number,
  spacingSec: number,
  fromHz: number,
  gain: number,
): SfxLayer[] {
  return Array.from({ length: count }, (_, index) => ({
    waveform: 'sine' as const,
    startSec: startSec + spacingSec * index + ((index * 7) % 3) * spacingSec * 0.2,
    durationSec: 0.035,
    frequencyHz: fromHz * (1 + ((index * 5) % 4) * 0.12),
    frequencyEndHz: fromHz * (1 + ((index * 5) % 4) * 0.12) * 1.9,
    envelope: hit(0.032, 0.003),
    gain: gain * (1 - (index * 0.4) / count),
  }));
}

/** Jaws snapping shut: a tight click and a short knock. */
export function jawSnap(startSec: number, gain: number): SfxLayer[] {
  return [
    burst(startSec, 0.012, gain, [bandpass(2600, undefined, 1.5)]),
    thump(startSec, 260, 140, 0.03, gain * 0.6),
  ];
}

/** Feet dragging on dirt. */
export function scuff(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(durationSec * 0.3, durationSec * 0.5, 0, durationSec * 0.2),
    gain,
    filters: [bandpass(900, 600, 1.2), highpass(250)],
  };
}

/** Short heavy hoof: sub drop and a puff of dirt, under 0.12 s. */
export function hoof(startSec: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, 70, 34, 0.11, gain),
    { ...burst(startSec, 0.07, gain * 0.45, [lowpass(240)]), envelope: hit(0.065, 0.003) },
    {
      ...burst(startSec, 0.05, gain * 0.25, [bandpass(450, undefined, 1.2)]),
      envelope: hit(0.045, 0.002),
    },
  ];
}
