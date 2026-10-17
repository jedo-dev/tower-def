import type { SfxEnvelope, SfxFormant, SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, hit, lowpass, shaped } from './recipeKit';

/**
 * Voices for the undead that speak or sing: a saw "glottis" fed through a
 * formant bank reads as a vowel, and white noise through the same bank reads
 * as breath on that vowel. Also the hollow bone knock of the skeleton.
 */

type FormantSpec = readonly [frequencyHz: number, q: number, gain: number];

function formantsOf(specs: readonly FormantSpec[], shiftTo?: readonly FormantSpec[]): SfxFormant[] {
  return specs.map(([frequencyHz, q, gain], index) => {
    const end = shiftTo?.[index]?.[0];
    return end === undefined || end === frequencyHz
      ? { frequencyHz, q, gain }
      : { frequencyHz, frequencyEndHz: end, q, gain };
  });
}

/** Low male "uuh": the zombie's moan (F1 ~ 500 Hz, F2 ~ 900 Hz). */
export const VOWEL_ZOMBIE_UH: readonly FormantSpec[] = [
  [500, 4, 1],
  [900, 5, 0.6],
  [2400, 7, 0.12],
];

/** Lower, darker "oo": the zombie's throat closing. */
export const VOWEL_ZOMBIE_OO: readonly FormantSpec[] = [
  [360, 4, 1],
  [720, 5, 0.5],
  [2200, 7, 0.08],
];

/** Soprano "aah" (900 / 1300 / 2800 Hz), a wide F1 so it carries any sung note. */
export const VOWEL_SOPRANO_AH: readonly FormantSpec[] = [
  [900, 2.5, 1],
  [1300, 6, 0.75],
  [2800, 8, 0.4],
];

/** Tired male vowels for the necromancer's murmured words. */
export const VOWEL_MURMUR_UH: readonly FormantSpec[] = [
  [520, 3.5, 1],
  [1000, 4.5, 0.55],
  [2400, 6, 0.15],
];
export const VOWEL_MURMUR_AH: readonly FormantSpec[] = [
  [700, 3.5, 1],
  [1150, 4.5, 0.6],
  [2500, 6, 0.15],
];
export const VOWEL_MURMUR_OH: readonly FormantSpec[] = [
  [450, 3.5, 1],
  [800, 4.5, 0.55],
  [2300, 6, 0.12],
];
export const VOWEL_MURMUR_EE: readonly FormantSpec[] = [
  [380, 3.5, 1],
  [1900, 5, 0.5],
  [2600, 6, 0.2],
];

export type VowelOptions = {
  startSec: number;
  durationSec: number;
  fromHz: number;
  toHz?: number;
  sweepCurve?: number;
  vowel: readonly FormantSpec[];
  /** Vowel the formants glide to over the layer. */
  vowelEnd?: readonly FormantSpec[];
  envelope: SfxEnvelope;
  gain: number;
  vibrato?: SfxLayer['vibrato'];
  jitter?: SfxLayer['jitter'];
  tremolo?: SfxLayer['tremolo'];
  drive?: number;
  /** Final softening low-pass. */
  brightnessHz?: number;
};

/** A voiced vowel: a saw glottis through a formant bank. */
export function voicedVowel(options: VowelOptions): SfxLayer {
  return {
    waveform: 'saw',
    startSec: options.startSec,
    durationSec: options.durationSec,
    frequencyHz: options.fromHz,
    ...(options.toHz === undefined ? {} : { frequencyEndHz: options.toHz }),
    ...(options.sweepCurve === undefined ? {} : { sweepCurve: options.sweepCurve }),
    ...(options.vibrato ? { vibrato: options.vibrato } : {}),
    ...(options.jitter ? { jitter: options.jitter } : {}),
    ...(options.tremolo ? { tremolo: options.tremolo } : {}),
    ...(options.drive === undefined ? {} : { drive: options.drive }),
    formants: formantsOf(options.vowel, options.vowelEnd),
    envelope: options.envelope,
    gain: options.gain,
    filters: [lowpass(options.brightnessHz ?? 3500)],
  };
}

/** Breath on a vowel: white noise through the same formant bank (a whisper). */
export function breathVowel(
  options: Pick<
    VowelOptions,
    'startSec' | 'durationSec' | 'vowel' | 'vowelEnd' | 'envelope' | 'gain' | 'tremolo'
  >,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec: options.startSec,
    durationSec: options.durationSec,
    frequencyHz: WHITE,
    ...(options.tremolo ? { tremolo: options.tremolo } : {}),
    formants: formantsOf(options.vowel, options.vowelEnd),
    envelope: options.envelope,
    gain: options.gain,
  };
}

/** A sung or moaned vowel with breath under it: the voiced layer plus its breath. */
export function vowelWithBreath(options: VowelOptions, breathGain: number): SfxLayer[] {
  return [
    voicedVowel(options),
    breathVowel({
      startSec: options.startSec,
      durationSec: options.durationSec,
      vowel: options.vowel,
      ...(options.vowelEnd ? { vowelEnd: options.vowelEnd } : {}),
      envelope: options.envelope,
      gain: breathGain,
    }),
  ];
}

/**
 * Hollow bone knock: a few milliseconds of noise rung through a narrow
 * 1-3 kHz band, with a woody low-mid body. No sustained tone.
 */
export function boneKnock(
  startSec: number,
  ringHz: number,
  gain: number,
  bodyHz = 650,
): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.022,
      frequencyHz: WHITE,
      envelope: hit(0.018, 0.0015),
      gain,
      filters: [bandpass(ringHz, undefined, 7)],
    },
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.03,
      frequencyHz: WHITE,
      envelope: hit(0.026, 0.0015),
      gain: gain * 0.8,
      filters: [bandpass(bodyHz, undefined, 3)],
    },
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.006,
      frequencyHz: 9000,
      envelope: hit(0.005, 0.0015),
      gain: gain * 0.35,
      filters: [bandpass(ringHz * 1.6, undefined, 1.5)],
    },
  ];
}

/**
 * A tired murmured syllable: a low voice that wanders slowly and rasps fast
 * (jitter), with as much breath as tone.
 */
export function murmur(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  vowel: readonly FormantSpec[],
  gain: number,
  breathGain: number,
): SfxLayer[] {
  return vowelWithBreath(
    {
      startSec,
      durationSec,
      fromHz,
      toHz,
      vowel,
      envelope: shaped(0.02, durationSec * 0.4, 0.6, durationSec * 0.35),
      gain,
      vibrato: { rateHz: 2.5, depth: 0.02 },
      jitter: { rateHz: 25, depth: 0.035 },
      brightnessHz: 2400,
    },
    breathGain,
  );
}

/** An unvoiced consonant (s, sh, t): a short hiss around `centerHz`. */
export function consonant(startSec: number, durationSec: number, centerHz: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(0.006, durationSec * 0.5, 0.3, durationSec * 0.3),
    gain: 0.35,
    filters: [bandpass(centerHz, undefined, 1.5)],
  };
}

/** Operatic vibrato: 5.5 Hz, about +-45 cents. */
export const SOPRANO_VIBRATO = { rateHz: 5.5, depth: 0.027 } as const;

/** A sung soprano "aah": saw through the soprano formants, vibrato and breath. */
export function soprano(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  envelope: SfxEnvelope,
  breathGain: number,
  options: { sweepCurve?: number; vibrato?: SfxLayer['vibrato'] } = {},
): SfxLayer[] {
  return vowelWithBreath(
    {
      startSec,
      durationSec,
      fromHz,
      ...(toHz === fromHz ? {} : { toHz }),
      ...(options.sweepCurve === undefined ? {} : { sweepCurve: options.sweepCurve }),
      vowel: VOWEL_SOPRANO_AH,
      envelope,
      gain: 1,
      vibrato: options.vibrato ?? SOPRANO_VIBRATO,
      brightnessHz: 5000,
    },
    breathGain,
  );
}
