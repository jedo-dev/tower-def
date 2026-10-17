import type { SfxLayer } from '../sfxRecipe.types';
import {
  crackle,
  distantHorn,
  dullThud,
  exhale,
  latch,
  leatherFlap,
  mutedCoin,
  rustle,
  timpani,
  warDrum,
} from './coreFoleyLayers';
import { NOTE, bandpass, burst, hit, lowpass, shaped, thump } from './recipeKit';
import type { SfxRecipeGroup } from './recipeGroups';

/** Sombre pad note for the defeat stinger. */
function dirge(frequencyHz: number, startSec: number, durationSec: number): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz,
    envelope: shaped(0.04, 0.1, 0.6, 0.15),
    gain: 0.3,
    filters: [lowpass(900, 500)],
  };
}

/** A soft low horn chord: one darkened saw per note, entering together. */
function hornChord(
  notes: number[],
  startSec: number,
  durationSec: number,
  gain: number,
): SfxLayer[] {
  return notes.map((note) => distantHorn(note, startSec, durationSec, gain, 900));
}

const B_FLAT_2 = 116.54;
const B_FLAT_1 = 58.27;

export const UI_RECIPES: SfxRecipeGroup<'ui'> = {
  'ui.click': {
    seed: 101,
    layers: [burst(0, 0.02, 0.6, [bandpass(2600, undefined, 1.2)]), thump(0, 1100, 700, 0.04, 0.5)],
  },
  'ui.hover': {
    seed: 102,
    loudness: 0.12,
    layers: [
      {
        waveform: 'sine',
        durationSec: 0.035,
        frequencyHz: 1500,
        frequencyEndHz: 1650,
        envelope: shaped(0.004, 0.03, 0, 0.005),
        gain: 0.5,
        filters: [lowpass(3000)],
      },
      {
        waveform: 'triangle',
        durationSec: 0.03,
        frequencyHz: 750,
        envelope: hit(0.028),
        gain: 0.15,
      },
    ],
  },
  // Parchment unrolled, then a wooden latch catches.
  'ui.open': {
    seed: 103,
    layers: [
      rustle(0, 0.2, 0.45, 1300, 2400),
      crackle(0.03, 0.35),
      crackle(0.085, 0.3, 1800),
      crackle(0.14, 0.25, 2500),
      ...latch(0.19, 0.6),
    ],
  },
  // A leather cover flaps shut onto a dull wooden lid.
  'ui.close': {
    seed: 104,
    layers: [
      ...leatherFlap(0, 0.7),
      rustle(0.02, 0.1, 0.12, 1600, 900),
      ...dullThud(0.12, 0.55, 120),
      burst(0.12, 0.02, 0.3, [bandpass(650, undefined, 1.5)], 6000),
    ],
  },
  'ui.error': {
    seed: 105,
    layers: [0, 0.12].flatMap((startSec): SfxLayer[] => [
      {
        waveform: 'square',
        startSec,
        durationSec: 0.1,
        frequencyHz: NOTE.A2,
        envelope: hit(0.09),
        gain: 0.35,
        filters: [lowpass(800)],
      },
      {
        waveform: 'square',
        startSec,
        durationSec: 0.1,
        frequencyHz: 116.5,
        envelope: hit(0.09),
        gain: 0.3,
        filters: [lowpass(800)],
      },
    ]),
  },
  // Wax-seal stamp: a soft squish pressed into a low wooden thump.
  'ui.success': {
    seed: 106,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.05,
        frequencyHz: 5000,
        envelope: shaped(0.015, 0.03, 0, 0.005),
        gain: 0.3,
        filters: [lowpass(900)],
      },
      thump(0.03, 150, 72, 0.16, 0.9),
      burst(0.03, 0.03, 0.5, [bandpass(700, undefined, 1.4)], 6000),
      { ...thump(0.04, 98, 86, 0.2, 0.3), envelope: shaped(0.01, 0.12, 0.2, 0.1) },
    ],
  },
  // A small tool lifted off its strap: a muted metal clink and a leather pat.
  'ui.build_select': {
    seed: 107,
    layers: [
      burst(0, 0.04, 0.25, [bandpass(1200, undefined, 1.2)], 7000),
      mutedCoin(0.02, 0.3, 1650),
      burst(0.03, 0.02, 0.35, [bandpass(1000, undefined, 1.2)], 8000),
      thump(0.03, 180, 110, 0.05, 0.4),
    ],
  },
  // One deep war-drum hit, a choir breathing out under it.
  'ui.faction_select': {
    seed: 108,
    layers: [
      ...warDrum(0, 0.75, 0.42),
      exhale(0.03, 0.5, 0.5, 800, 500),
      exhale(0.03, 0.48, 0.3, 1300, 900),
      {
        waveform: 'saw',
        startSec: 0.04,
        durationSec: 0.46,
        frequencyHz: NOTE.D3,
        vibrato: { rateHz: 5, depth: 0.006 },
        envelope: shaped(0.12, 0.15, 0.4, 0.18),
        gain: 0.07,
        filters: [bandpass(650, 500, 2)],
      },
    ],
  },
  'ui.wave_start': {
    seed: 109,
    layers: [
      {
        waveform: 'saw',
        durationSec: 0.7,
        frequencyHz: 138,
        frequencyEndHz: NOTE.D3,
        sweepCurve: 0.3,
        vibrato: { rateHz: 5, depth: 0.006 },
        envelope: shaped(0.06, 0.1, 0.8, 0.25),
        gain: 0.45,
        filters: [lowpass(400, 1400, 0.9)],
      },
      {
        waveform: 'saw',
        startSec: 0.05,
        durationSec: 0.65,
        frequencyHz: NOTE.A3,
        vibrato: { rateHz: 5, depth: 0.006 },
        envelope: shaped(0.06, 0.1, 0.8, 0.25),
        gain: 0.25,
        filters: [lowpass(1200)],
      },
      thump(0, 70, 42, 0.25, 0.7),
      burst(0, 0.08, 0.3, [lowpass(300)]),
    ],
  },
  // Two distant held horn calls on D, then the last strokes of a drum roll.
  'ui.wave_complete': {
    seed: 110,
    echo: { delaySec: 0.13, feedback: 0.2, mix: 0.22 },
    tailSec: 0.06,
    layers: [
      distantHorn(NOTE.D3, 0, 0.3, 0.4),
      exhale(0, 0.3, 0.1, 900, 700),
      distantHorn(NOTE.D3, 0.36, 0.42, 0.42),
      exhale(0.36, 0.42, 0.1, 900, 700),
      ...[0.58, 0.63, 0.68, 0.73, 0.79, 0.86].flatMap((startSec, index) =>
        warDrum(startSec, 0.42 - index * 0.05, 0.08),
      ),
    ],
  },
  'ui.game_over': {
    seed: 111,
    echo: { delaySec: 0.17, feedback: 0.3, mix: 0.3 },
    tailSec: 0.1,
    layers: [
      {
        waveform: 'fm',
        durationSec: 1.1,
        frequencyHz: NOTE.D2,
        fm: { ratio: 1.41, index: 4, indexEnd: 0.3 },
        envelope: hit(1.05),
        gain: 0.5,
      },
      dirge(NOTE.A3, 0, 0.35),
      dirge(NOTE.F3, 0.3, 0.4),
      dirge(NOTE.D3, 0.65, 0.5),
    ],
  },
  // Dark fanfare: low D minor horns, a Bb lift, resolving to a held D over timpani.
  'ui.victory': {
    seed: 112,
    echo: { delaySec: 0.15, feedback: 0.2, mix: 0.18 },
    layers: [
      ...hornChord([NOTE.A2, NOTE.D3, NOTE.F3], 0, 0.3, 0.22),
      ...hornChord([B_FLAT_2, NOTE.D3, NOTE.F3], 0.32, 0.3, 0.22),
      distantHorn(NOTE.D3, 0.64, 0.86, 0.36, 900),
      distantHorn(NOTE.D2, 0.64, 0.86, 0.3, 900),
      exhale(0.64, 0.8, 0.08, 900, 600),
      ...timpani(0, 0.7, NOTE.D2),
      ...timpani(0.32, 0.6, B_FLAT_1),
      ...[0.5, 0.54, 0.58].flatMap((startSec, index) =>
        timpani(startSec, 0.25 + index * 0.08, NOTE.A2 / 2, 0.08),
      ),
      ...timpani(0.64, 0.9, NOTE.D2, 0.7),
    ],
  },
};
