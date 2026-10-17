/**
 * Layer shorthands for the human race clips (copied, not shared, per the race
 * authoring rules in docs/SOUND_ASSET_LIST.md).
 */
import type { SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, bell, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';

/** Human throat: a cleaner saw than the orc bark, through a brighter vowel band. */
export function voice(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
  formantHz = 1100,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 0.8,
    vibrato: { rateHz: 6, depth: 0.015 },
    envelope: shaped(0.01, durationSec * 0.5, 0.4, durationSec * 0.35),
    gain,
    filters: [bandpass(formantHz, undefined, 1.6)],
  };
}

/** Light leather slap: a soft band of noise on a small body thump. */
export function slap(startSec: number, gain: number): SfxLayer[] {
  return [
    burst(startSec, 0.025, gain, [bandpass(1700, undefined, 1.2)]),
    thump(startSec, 170, 100, 0.05, gain * 0.7),
  ];
}

/** Wooden tool knock: a hollow pitched tock with a dry click. */
export function knock(startSec: number, gain: number, frequencyHz = 420): SfxLayer[] {
  return [
    thump(startSec, frequencyHz, frequencyHz * 0.6, 0.045, gain),
    burst(startSec, 0.02, gain * 0.6, [bandpass(frequencyHz * 2.5, undefined, 3)], 8000),
  ];
}

/** Small steel or brass ring. */
export function clink(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return bell(frequencyHz, startSec, durationSec, gain, { ratio: 1.41, index: 2 });
}

/** Chainmail shiver: fast-gated bright crunch. */
export function chainmail(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 6000,
    tremolo: { rateHz: 32, depth: 0.8 },
    envelope: shaped(0.01, durationSec * 0.6, 0.2, durationSec * 0.3),
    gain,
    filters: [highpass(2500)],
  };
}

/** Black powder: a sharp crack and a short driven rumble. */
export function powderCrack(startSec: number, gain: number): SfxLayer[] {
  return [
    burst(startSec, 0.02, gain, [highpass(1200)]),
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.12,
      frequencyHz: WHITE,
      drive: 1.5,
      envelope: hit(0.11),
      gain: gain * 0.8,
      filters: [lowpass(2500, 300)],
    },
  ];
}

/** Iron-shod hoof on hard ground. */
export function hoof(startSec: number, gain: number, clopHz = 1800): SfxLayer[] {
  return [
    thump(startSec, 260, 140, 0.035, gain),
    burst(startSec, 0.015, gain * 0.5, [bandpass(clopHz, undefined, 2)], 6000),
  ];
}

/** Struck plate armour: a heavy, low inharmonic ring. */
export function plate(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'fm',
    startSec,
    durationSec,
    frequencyHz,
    fm: { ratio: 2.76, index: 3, indexEnd: 0.4 },
    envelope: hit(durationSec * 0.95),
    gain,
    filters: [lowpass(4500)],
  };
}

/** One wingbeat: a soft swell of low air and a feathery push. */
export function wingbeat(startSec: number, gain: number): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.09,
      frequencyHz: WHITE,
      envelope: shaped(0.03, 0.04, 0, 0.02),
      gain,
      filters: [lowpass(900, 400)],
    },
    thump(startSec + 0.02, 90, 60, 0.07, gain * 0.5),
  ];
}

/** Hawk-like cry: a bright, quivering saw high in the band. */
export function screech(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 0.6,
    vibrato: { rateHz: 22, depth: 0.025 },
    envelope: shaped(0.01, durationSec * 0.4, 0.5, durationSec * 0.4),
    gain,
    filters: [bandpass(2600, undefined, 2.5)],
  };
}

/** Creaking timber: a slow stick-slip buzz through a narrow wooden band. */
export function creak(
  startSec: number,
  durationSec: number,
  frequencyHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz,
    frequencyEndHz: frequencyHz * 1.25,
    tremolo: { rateHz: 23, depth: 0.6 },
    envelope: shaped(0.04, durationSec * 0.5, 0.5, durationSec * 0.3),
    gain,
    filters: [bandpass(800, 1100, 5)],
  };
}

/** Iron wheel rattle: a low gritty roll. */
export function ironWheels(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 300,
    tremolo: { rateHz: 14, depth: 0.7 },
    envelope: shaped(0.05, durationSec * 0.6, 0.4, durationSec * 0.3),
    gain,
    filters: [bandpass(1800, undefined, 1.4)],
  };
}

/** Glassy arcane chime with a slow shimmer. */
export function glass(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return {
    ...bell(frequencyHz, startSec, durationSec, gain, { ratio: 3.5, index: 1.2 }),
    tremolo: { rateHz: 11, depth: 0.4 },
  };
}

/** Arcane rush: band of air sweeping between two centres. */
export function whoosh(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(durationSec * 0.4, durationSec * 0.4, 0.2, durationSec * 0.2),
    gain,
    filters: [bandpass(fromHz, toHz, 2)],
  };
}

/** Trumpet-like call: a bright saw with a slow swell. */
export function trumpet(
  startSec: number,
  durationSec: number,
  frequencyHz: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz,
    vibrato: { rateHz: 5.5, depth: 0.01 },
    envelope: shaped(0.025, 0.05, 0.75, durationSec * 0.3),
    gain,
    filters: [bandpass(1300, undefined, 1.2), lowpass(3500)],
  };
}
