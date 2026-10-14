import type { SfxLayer } from '../sfxRecipe.types';
import { NOTE, WHITE, bandpass, bell, burst, hit, lowpass, shaped, thump } from './recipeKit';
import type { SfxRecipeGroup } from './recipeGroups';

/** Low brass voice for the horn and fanfare stingers. */
function brass(frequencyHz: number, startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'saw',
    startSec,
    durationSec,
    frequencyHz,
    envelope: shaped(0.025, 0.06, 0.8, 0.05),
    gain,
    filters: [lowpass(1800)],
  };
}

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
  'ui.open': {
    seed: 103,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.2,
        frequencyHz: WHITE,
        envelope: shaped(0.06, 0.08, 0.3, 0.06),
        gain: 0.5,
        filters: [bandpass(500, 2200, 1.5)],
      },
      {
        waveform: 'triangle',
        durationSec: 0.18,
        frequencyHz: NOTE.D4,
        frequencyEndHz: NOTE.A4,
        envelope: shaped(0.02, 0.1, 0.4, 0.06),
        gain: 0.45,
        filters: [lowpass(2500)],
      },
    ],
  },
  'ui.close': {
    seed: 104,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.19,
        frequencyHz: WHITE,
        envelope: shaped(0.03, 0.08, 0.3, 0.06),
        gain: 0.5,
        filters: [bandpass(2200, 500, 1.5)],
      },
      {
        waveform: 'triangle',
        durationSec: 0.17,
        frequencyHz: NOTE.A4,
        frequencyEndHz: NOTE.D4,
        envelope: shaped(0.01, 0.1, 0.4, 0.06),
        gain: 0.45,
        filters: [lowpass(2500)],
      },
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
  'ui.success': {
    seed: 106,
    layers: [bell(NOTE.D5, 0, 0.3, 0.5), bell(NOTE.A5, 0.07, 0.29, 0.42, { ratio: 2 })],
  },
  'ui.build_select': {
    seed: 107,
    layers: [
      burst(0, 0.03, 0.5, [bandpass(1400, undefined, 2)]),
      {
        waveform: 'triangle',
        durationSec: 0.1,
        frequencyHz: NOTE.G3,
        envelope: hit(0.09),
        gain: 0.5,
      },
      { waveform: 'sine', durationSec: 0.08, frequencyHz: NOTE.G4, envelope: hit(0.07), gain: 0.2 },
    ],
  },
  'ui.faction_select': {
    seed: 108,
    layers: [
      {
        waveform: 'fm',
        durationSec: 0.4,
        frequencyHz: 98,
        fm: { ratio: 1.41, index: 3, indexEnd: 0.4 },
        envelope: hit(0.38),
        gain: 0.6,
      },
      bell(NOTE.D4, 0.01, 0.3, 0.25, { ratio: 2, index: 1 }),
      burst(0, 0.02, 0.3, [lowpass(2000)]),
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
  'ui.wave_complete': {
    seed: 110,
    echo: { delaySec: 0.11, feedback: 0.25, mix: 0.25 },
    tailSec: 0.15,
    layers: [
      bell(NOTE.D4, 0, 0.45, 0.35, { ratio: 2 }),
      bell(NOTE.F4, 0.09, 0.45, 0.38, { ratio: 2 }),
      bell(NOTE.A4, 0.18, 0.45, 0.4, { ratio: 2 }),
      bell(NOTE.D5, 0.27, 0.45, 0.45, { ratio: 2 }),
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
  'ui.victory': {
    seed: 112,
    echo: { delaySec: 0.13, feedback: 0.25, mix: 0.2 },
    layers: [
      brass(NOTE.D4, 0, 0.16, 0.35),
      brass(NOTE.Fs4, 0.14, 0.16, 0.35),
      brass(NOTE.A4, 0.28, 0.16, 0.35),
      ...[
        { note: NOTE.D5, gain: 0.3 },
        { note: NOTE.A4, gain: 0.25 },
        { note: NOTE.Fs4, gain: 0.22 },
        { note: NOTE.D4, gain: 0.25 },
      ].map(({ note, gain }): SfxLayer => ({
        waveform: 'saw',
        startSec: 0.42,
        durationSec: 0.8,
        frequencyHz: note,
        vibrato: { rateHz: 5.5, depth: 0.004 },
        envelope: shaped(0.03, 0.2, 0.7, 0.35),
        gain,
        filters: [lowpass(2200, 1200)],
      })),
      thump(0, 80, 45, 0.2, 0.6),
      thump(0.42, 80, 45, 0.2, 0.6),
    ],
  },
};
