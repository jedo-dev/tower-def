/**
 * Foley shorthands for the race-neutral core clips: paper, leather, wood,
 * stone, sand and coin. No helper carries a melodic line; the only pitched
 * voices are the horns of the two stingers, held on one note at a time.
 */
import type { SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, bell, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';

/** Dry paper or parchment: crunchy, fast-gated noise through a broad band. */
export function rustle(
  startSec: number,
  durationSec: number,
  gain: number,
  fromHz: number,
  toHz: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 7000,
    tremolo: { rateHz: 41, depth: 0.75 },
    envelope: shaped(durationSec * 0.3, durationSec * 0.4, 0.35, durationSec * 0.3),
    gain,
    filters: [bandpass(fromHz, toHz, 0.8), lowpass(4500)],
  };
}

/** Single crackle of a stiff sheet. */
export function crackle(startSec: number, gain: number, centreHz = 2200): SfxLayer {
  return burst(startSec, 0.012, gain, [bandpass(centreHz, undefined, 1.4)], 9000);
}

/** Small wooden latch: a dry hollow tock and the catch snapping a beat later. */
export function latch(startSec: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, 620, 400, 0.03, gain),
    burst(startSec, 0.012, gain * 0.7, [bandpass(1900, undefined, 2.5)], 9000),
    burst(startSec + 0.018, 0.01, gain * 0.45, [bandpass(1500, undefined, 2.5)], 9000),
  ];
}

/** Leather flap: a soft push of air that ends in a muffled slap. */
export function leatherFlap(startSec: number, gain: number): SfxLayer[] {
  return [
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.07,
      frequencyHz: WHITE,
      envelope: shaped(0.035, 0.03, 0, 0.005),
      gain: gain * 0.6,
      filters: [lowpass(1400, 600)],
    },
    burst(startSec + 0.06, 0.03, gain, [bandpass(1000, undefined, 1.2)], 8000),
    thump(startSec + 0.06, 170, 100, 0.05, gain * 0.6),
  ];
}

/** Dull wooden lid or crate landing: low knock with a puff of dust. */
export function dullThud(startSec: number, gain: number, fromHz = 130): SfxLayer[] {
  return [
    thump(startSec, fromHz, fromHz * 0.5, 0.12, gain),
    burst(startSec, 0.04, gain * 0.5, [lowpass(450)]),
  ];
}

/** Stone block knocking on stone: a short low tock and a gritty crunch. */
export function stoneKnock(startSec: number, gain: number, fromHz = 180): SfxLayer[] {
  return [
    thump(startSec, fromHz, fromHz * 0.55, 0.07, gain),
    burst(startSec, 0.035, gain * 0.8, [bandpass(fromHz * 3.5, undefined, 1.2)], 4000),
  ];
}

/** Gritty scrape: crunchy noise with an uneven, grinding gate. */
export function scrape(
  startSec: number,
  durationSec: number,
  gain: number,
  centreHz: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 2600,
    tremolo: { rateHz: 17, depth: 0.55 },
    envelope: shaped(durationSec * 0.25, durationSec * 0.4, 0.5, durationSec * 0.3),
    gain,
    filters: [bandpass(centreHz, centreHz * 0.8, 1), lowpass(3000)],
  };
}

/** Muted coin: a very short inharmonic tick with its shine filtered off. */
export function mutedCoin(startSec: number, gain: number, frequencyHz = 2300): SfxLayer {
  return {
    ...bell(frequencyHz, startSec, 0.035, gain, { ratio: 1.41, index: 1.5 }),
    filters: [lowpass(3200)],
  };
}

/** Leather pouch taking a weight: soft low pat. */
export function pouch(startSec: number, gain: number): SfxLayer[] {
  return [
    thump(startSec, 210, 120, 0.05, gain),
    burst(startSec, 0.025, gain * 0.5, [bandpass(800, undefined, 1.2)], 7000),
  ];
}

/** Deep war drum: low skin, a slap of the head and a puff of air. */
export function warDrum(startSec: number, gain: number, durationSec = 0.35): SfxLayer[] {
  return [
    thump(startSec, 88, 42, durationSec, gain),
    burst(startSec, 0.05, gain * 0.45, [lowpass(400)]),
    burst(startSec, 0.015, gain * 0.25, [bandpass(900, undefined, 1.5)], 8000),
  ];
}

/** Timpani: a tuned kettle stroke that settles onto `toHz`. */
export function timpani(
  startSec: number,
  gain: number,
  toHz: number,
  durationSec = 0.4,
): SfxLayer[] {
  return [
    thump(startSec, toHz * 1.5, toHz, durationSec, gain),
    burst(startSec, 0.03, gain * 0.35, [lowpass(600)]),
  ];
}

/** Breath through a vowel band: exhales, sighs, choir air. */
export function exhale(
  startSec: number,
  durationSec: number,
  gain: number,
  fromHz = 1000,
  toHz = 550,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(durationSec * 0.2, durationSec * 0.5, 0.2, durationSec * 0.3),
    gain,
    filters: [bandpass(fromHz, toHz, 1.6), highpass(200)],
  };
}

/** Distant low horn on one held note, darkened so no brass edge remains. */
export function distantHorn(
  frequencyHz: number,
  startSec: number,
  durationSec: number,
  gain: number,
  cutoffHz = 700,
): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz,
    vibrato: { rateHz: 4.5, depth: 0.004 },
    envelope: shaped(0.07, 0.1, 0.75, durationSec * 0.35),
    gain,
    filters: [lowpass(cutoffHz, cutoffHz * 0.75, 0.8)],
  };
}

/** Grain hiss: fine crunchy noise for sand, gravel trickle and dust. */
export function sandHiss(
  startSec: number,
  durationSec: number,
  gain: number,
  fromHz: number,
  toHz: number,
): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: 9000,
    tremolo: { rateHz: 53, depth: 0.45 },
    envelope: shaped(durationSec * 0.2, durationSec * 0.3, 0.6, durationSec * 0.4),
    gain,
    filters: [bandpass(fromHz, toHz, 0.9), lowpass(5000)],
  };
}

/** A string snapping forward and the bolt cutting air: crossbow release. */
export function thwip(startSec: number, gain: number): SfxLayer[] {
  return [
    burst(startSec, 0.01, gain * 0.8, [bandpass(2600, undefined, 1.5)], 9000),
    {
      waveform: 'noise',
      startSec,
      durationSec: 0.09,
      frequencyHz: WHITE,
      envelope: hit(0.08, 0.004),
      gain,
      filters: [bandpass(2200, 700, 1.4)],
    },
    thump(startSec, 320, 170, 0.035, gain * 0.6),
  ];
}

/** Gritty debris: crunchy low-held noise, for dirt, rubble and body falls. */
export function grit(
  startSec: number,
  durationSec: number,
  gain: number,
  centreHz: number,
): SfxLayer {
  return {
    ...burst(startSec, durationSec, gain, [bandpass(centreHz, centreHz * 0.6, 1)], 3000),
    envelope: hit(durationSec * 0.9, 0.003),
  };
}

/** Hollow wooden click: a frame or block tipping over. */
export function woodClick(startSec: number, gain: number, frequencyHz = 480): SfxLayer[] {
  return [
    thump(startSec, frequencyHz, frequencyHz * 0.6, 0.04, gain),
    burst(startSec, 0.015, gain * 0.6, [bandpass(frequencyHz * 3, undefined, 2.5)], 9000),
  ];
}
