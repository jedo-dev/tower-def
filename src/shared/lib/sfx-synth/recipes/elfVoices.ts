import type { SfxLayer } from '../sfxRecipe.types';
import {
  WHITE,
  bandpass,
  bell,
  burst,
  highpass,
  hit,
  lowpass,
  shaped,
  swell,
  thump,
} from './recipeKit';

/**
 * Sound shorthands for the elf creatures and towers: forest voices (cries,
 * growls, roars, screeches), wood, leaves, wings, chimes and stone. Every
 * helper returns plain layer data, so the recipes stay readable lists.
 */

/** Plucked string: a triangle that settles a little flat, with a faint wobble. */
export function bowstring(startSec: number, frequencyHz: number, gain: number): SfxLayer {
  return {
    waveform: 'triangle',
    startSec,
    durationSec: 0.14,
    frequencyHz,
    frequencyEndHz: frequencyHz * 0.9,
    vibrato: { rateHz: 30, depth: 0.01 },
    envelope: hit(0.13),
    gain,
    filters: [lowpass(2000)],
  };
}

/** Dry leaves: flickering high noise. */
export function leaves(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    tremolo: { rateHz: 31, depth: 0.85 },
    envelope: shaped(durationSec * 0.25, durationSec * 0.5, 0.2, durationSec * 0.2),
    gain,
    filters: [bandpass(3200, 2400, 1.2)],
  };
}

/**
 * Voiced throat: a buzzy saw through one vowel band. Low and driven it
 * roars, high and clean it cries.
 */
export function voice(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
  options: { formantHz: number; drive?: number; roughHz?: number; waveform?: 'saw' | 'triangle' },
): SfxLayer {
  return {
    waveform: options.waveform ?? 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    vibrato: { rateHz: 6, depth: 0.025 },
    ...(options.roughHz === undefined ? {} : { tremolo: { rateHz: options.roughHz, depth: 0.55 } }),
    ...(options.drive === undefined ? {} : { drive: options.drive }),
    envelope: shaped(Math.min(0.04, durationSec * 0.2), durationSec * 0.5, 0.4, durationSec * 0.3),
    gain,
    filters: [bandpass(options.formantHz, undefined, 1.6), lowpass(options.formantHz * 3)],
  };
}

/** Breath under a voice. */
export function breath(
  startSec: number,
  durationSec: number,
  gain: number,
  centerHz: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(0.02, durationSec * 0.6, 0.1, durationSec * 0.3),
    gain,
    filters: [bandpass(centerHz, centerHz * 0.6, 1.1)],
  };
}

/** One wing stroke: a rush of air whose band falls; `cutoffHz` sets feathers vs leather. */
export function wingbeat(startSec: number, gain: number, cutoffHz: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec: 0.1,
    frequencyHz: WHITE,
    envelope: shaped(0.035, 0.05, 0, 0.012),
    gain,
    filters: [lowpass(cutoffHz, cutoffHz * 0.4, 1.4)],
  };
}

/** Wooden knock: hooves, staves, a druid's thump. */
export function knock(startSec: number, frequencyHz: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, frequencyHz, frequencyHz * 0.6, 0.06, gain),
    burst(startSec, 0.018, gain * 0.6, [bandpass(frequencyHz * 5, undefined, 2.5)], 7000),
  ];
}

/** Wind chime: an inharmonic, softly struck tube. */
export function windChime(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return bell(frequencyHz, startSec, durationSec, gain, {
    ratio: 2.76,
    index: 0.9,
    attackSec: 0.004,
  });
}

/** Tiny bright sparkles: a few short high bells with an airy hiss. */
export function sparkle(
  startSec: number,
  notes: readonly number[],
  stepSec: number,
  gain: number,
): SfxLayer[] {
  return [
    ...notes.map((note, index) =>
      bell(note, startSec + index * stepSec, 0.12, gain, { ratio: 3.5, index: 0.7 }),
    ),
    {
      ...burst(startSec, notes.length * stepSec + 0.08, gain * 0.35, [highpass(6000)]),
      envelope: swell(0.02, 0.06, 0.6),
    },
  ];
}

/** Grinding stone: coarse, slow-held noise rolling under a low band. */
export function rockGrind(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 900,
    tremolo: { rateHz: 11, depth: 0.6 },
    envelope: shaped(durationSec * 0.3, durationSec * 0.4, 0.4, durationSec * 0.3),
    gain,
    filters: [lowpass(900, 500, 1.2)],
  };
}

/** Massive stomp: a very low skin with a dull crunch of earth. */
export function stomp(startSec: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, 68, 32, 0.22, gain),
    burst(startSec, 0.05, gain * 0.5, [lowpass(320)], 1800),
  ];
}

/** Acid hiss: a sizzling, crackling high band. */
export function acidHiss(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    tremolo: { rateHz: 47, depth: 0.5 },
    envelope: shaped(0.01, durationSec * 0.6, 0.3, durationSec * 0.3),
    gain,
    filters: [highpass(2200), lowpass(4500)],
  };
}

/** Glaive whirr: a spinning blade, a band of air chopped at the spin rate. */
export function glaiveWhirr(startSec: number, durationSec: number, gain: number): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec,
      frequencyHz: WHITE,
      tremolo: { rateHz: 24, depth: 0.9 },
      envelope: shaped(durationSec * 0.3, durationSec * 0.4, 0.5, durationSec * 0.3),
      gain,
      filters: [bandpass(1300, 2100, 3)],
    },
    {
      waveform: 'fm',
      startSec,
      durationSec,
      frequencyHz: 930,
      frequencyEndHz: 1010,
      fm: { ratio: 1.41, index: 1.2, indexEnd: 0.4 },
      tremolo: { rateHz: 24, depth: 0.7 },
      envelope: swell(durationSec * 0.3, durationSec * 0.4, 0.6),
      gain: gain * 0.25,
    },
  ];
}

/** Hawk screech: a high, rasping call through a bright band. */
export function screech(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'fm',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    fm: { ratio: 0.5, index: 1.4, indexEnd: 0.8 },
    vibrato: { rateHz: 17, depth: 0.03 },
    envelope: shaped(0.015, durationSec * 0.6, 0.3, durationSec * 0.3),
    gain,
    filters: [bandpass(2600, 2000, 1.4), lowpass(4800)],
  };
}

/** Water drop: a sine that springs upwards. */
export function droplet(startSec: number, fromHz: number, toHz: number, gain: number): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec: 0.06,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    sweepCurve: 0.6,
    envelope: hit(0.055, 0.003),
    gain,
  };
}
