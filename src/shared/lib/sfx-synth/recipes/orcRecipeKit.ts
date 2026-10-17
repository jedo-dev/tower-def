import type { OrcSoundId } from '../../../types/sound-ids';
import type { SfxLayer, SfxRecipe } from '../sfxRecipe.types';
import { WHITE, bandpass, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';

/**
 * Orc voices, drums and gear, shared by the orc recipe files. Copied here
 * rather than added to `recipeKit.ts`, which every race shares.
 */

/** Recipes for a subset of the orc ids, spread into `ORC_RECIPES`. */
export type OrcRecipes<TId extends OrcSoundId> = Record<TId, SfxRecipe>;

/** The four recipes of one orc creature. */
export type OrcCreatureRecipes<TUnitId extends string> = OrcRecipes<
  Extract<OrcSoundId, `combat.creep.${TUnitId}.${string}`>
>;

/** War drum: low skin and a puff of air. */
export function drum(startSec: number, gain: number): SfxLayer[] {
  return [thump(startSec, 82, 44, 0.16, gain), burst(startSec, 0.04, gain * 0.45, [lowpass(400)])];
}

/** Hoarse orc throat: driven saw through a vowel-like band. */
export function bark(
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
    drive: 2.2,
    envelope: shaped(0.01, durationSec * 0.6, 0.35, durationSec * 0.3),
    gain,
    filters: [bandpass(750, undefined, 1.8)],
  };
}

/** Rough breath under a shout or groan. */
export function breath(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(0.02, durationSec * 0.7, 0, durationSec * 0.2),
    gain,
    filters: [bandpass(1100, 600, 1.2)],
  };
}

/** Dry wooden crack: a short band of crunchy noise and a clipped knock. */
export function woodSnap(startSec: number, gain: number): SfxLayer {
  return burst(startSec, 0.03, gain, [bandpass(1700, undefined, 2.5)], 9000);
}

/** Small iron tool knock: an inharmonic FM strike that rings briefly. */
export function clank(
  startSec: number,
  frequencyHz: number,
  durationSec: number,
  gain: number,
): SfxLayer {
  return {
    waveform: 'fm',
    startSec,
    durationSec,
    frequencyHz,
    fm: { ratio: 2.76, index: 3, indexEnd: 0.4 },
    envelope: hit(durationSec * 0.9),
    gain,
    filters: [highpass(500)],
  };
}

/** Thin high voice: a lightly driven saw through a narrow, nasal band. */
export function yelp(
  startSec: number,
  durationSec: number,
  fromHz: number,
  toHz: number,
  gain: number,
  bandHz = 1400,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: fromHz,
    frequencyEndHz: toHz,
    drive: 1.2,
    envelope: shaped(0.005, durationSec * 0.5, 0.3, durationSec * 0.35),
    gain,
    filters: [bandpass(bandHz, undefined, 2.5)],
  };
}

/** A paw or hoof landing: a short knock and a scuff of dirt. */
export function footfall(startSec: number, gain: number, pitchHz = 130): SfxLayer[] {
  return [
    thump(startSec, pitchHz, pitchHz * 0.55, 0.06, gain),
    burst(startSec, 0.025, gain * 0.4, [bandpass(700, undefined, 1.5)], 6000),
  ];
}

/** Gourd rattle: crunchy high noise shaken in fast pulses. */
export function rattle(startSec: number, durationSec: number, gain: number, rateHz = 26): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 7000,
    tremolo: { rateHz, depth: 0.9 },
    envelope: shaped(0.004, durationSec * 0.6, 0.3, durationSec * 0.3),
    gain,
    filters: [bandpass(3200, undefined, 1.6)],
  };
}

/** Crackling spark: coarse, stuttering high noise. */
export function spark(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 2600,
    tremolo: { rateHz: 47, depth: 0.85 },
    envelope: hit(durationSec * 0.9),
    gain,
    filters: [highpass(1800)],
  };
}

/** Low chant: two hoarse voices a fifth apart, swaying slowly. */
export function chant(
  startSec: number,
  durationSec: number,
  rootHz: number,
  endHz: number,
  gain: number,
): SfxLayer[] {
  const voice = (ratio: number, voiceGain: number): SfxLayer => ({
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz: rootHz * ratio,
    frequencyEndHz: endHz * ratio,
    vibrato: { rateHz: 5, depth: 0.015 },
    drive: 1,
    envelope: shaped(durationSec * 0.2, durationSec * 0.3, 0.7, durationSec * 0.3),
    gain: voiceGain,
    filters: [bandpass(620, undefined, 1.6)],
  });
  return [voice(1, gain), voice(1.5, gain * 0.6)];
}

/** Wyvern screech: a harsh, fluttering high cry. */
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
    vibrato: { rateHz: 31, depth: 0.04 },
    drive: 2.4,
    envelope: shaped(0.008, durationSec * 0.5, 0.45, durationSec * 0.3),
    gain,
    filters: [bandpass(2400, undefined, 1.8)],
  };
}

/** One heavy wingbeat: a dark swell of pushed air. */
export function wingbeat(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(durationSec * 0.35, durationSec * 0.45, 0, durationSec * 0.2),
    gain,
    filters: [bandpass(380, 220, 1.1)],
  };
}

/** Thrown spear through the air: a narrow whistling band of noise. */
export function whistle(
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
    envelope: shaped(durationSec * 0.5, durationSec * 0.3, 0, durationSec * 0.2),
    gain,
    filters: [bandpass(fromHz, toHz, 9)],
  };
}
