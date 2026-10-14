import type { SfxLayer } from '../sfxRecipe.types';
import {
  NOTE,
  WHITE,
  bandpass,
  burst,
  highpass,
  hit,
  lowpass,
  shaped,
  swell,
  thump,
} from './recipeKit';
import type { RaceSfxRecipeGroup } from './recipeGroups';

/** A dry bone click: crunchy held noise at a few kHz. */
function boneClick(startSec: number, holdHz: number, gain: number): SfxLayer {
  return burst(startSec, 0.025, gain, [highpass(700)], holdHz);
}

/** Necrotic hiss: thin, airy noise that trails a shot. */
function hiss(startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'noise',
    startSec,
    durationSec,
    frequencyHz: WHITE,
    envelope: shaped(0.02, durationSec * 0.7, 0, 0.03),
    gain,
    filters: [highpass(3500)],
  };
}

/** War drum: low skin and a puff of air. */
function drum(startSec: number, gain: number): SfxLayer[] {
  return [thump(startSec, 82, 44, 0.16, gain), burst(startSec, 0.04, gain * 0.45, [lowpass(400)])];
}

export const UNDEAD_RECIPES: RaceSfxRecipeGroup<'undead'> = {
  'combat.attack.single.undead': {
    seed: 501,
    layers: [
      burst(0, 0.02, 0.5, [bandpass(3000)], 2800),
      {
        waveform: 'triangle',
        durationSec: 0.14,
        frequencyHz: 210,
        frequencyEndHz: 130,
        envelope: hit(0.12),
        gain: 0.45,
        filters: [lowpass(1800)],
      },
      hiss(0.02, 0.15, 0.12),
    ],
  },
  'combat.attack.splash.undead': {
    seed: 502,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.28,
        frequencyHz: WHITE,
        envelope: shaped(0.03, 0.2, 0.1, 0.05),
        gain: 0.45,
        filters: [bandpass(350, 1100, 1.5)],
      },
      thump(0, 95, 55, 0.2, 0.5),
      { ...hiss(0.08, 0.24, 0.15), tremolo: { rateHz: 17, depth: 0.5 } },
    ],
  },
  'combat.attack.frost.undead': {
    seed: 503,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.3,
        frequencyHz: WHITE,
        envelope: shaped(0.05, 0.15, 0.4, 0.1),
        gain: 0.5,
        filters: [bandpass(2600, 1400, 0.9), lowpass(5000)],
      },
      {
        waveform: 'fm',
        startSec: 0.03,
        durationSec: 0.25,
        frequencyHz: 1320,
        fm: { ratio: 1.5, index: 1, indexEnd: 0.2 },
        envelope: shaped(0.02, 0.2, 0, 0.03),
        gain: 0.18,
      },
      {
        waveform: 'saw',
        durationSec: 0.25,
        frequencyHz: 82,
        envelope: swell(0.05, 0.12),
        gain: 0.2,
        filters: [lowpass(400)],
      },
    ],
  },
  'combat.impact.undead': {
    seed: 504,
    layers: [
      burst(0, 0.03, 0.6, [highpass(800)], 2200),
      {
        waveform: 'square',
        durationSec: 0.025,
        frequencyHz: 320,
        frequencyEndHz: 110,
        envelope: hit(0.02),
        gain: 0.3,
        filters: [lowpass(2500)],
      },
      boneClick(0.03, 3200, 0.3),
    ],
  },
  'combat.build.undead': {
    seed: 505,
    layers: [
      ...[0, 0.045, 0.095, 0.16, 0.21].map((startSec, index) =>
        boneClick(startSec, [2500, 3200, 2800, 3000, 2600][index], 0.5 - index * 0.05),
      ),
      thump(0, 180, 110, 0.1, 0.3),
      {
        waveform: 'saw',
        durationSec: 0.3,
        frequencyHz: NOTE.D2,
        envelope: swell(0.05, 0.15),
        gain: 0.2,
        filters: [lowpass(300)],
      },
    ],
  },
  'combat.creep_death.undead': {
    seed: 506,
    layers: [
      boneClick(0, 2600, 0.5),
      boneClick(0.03, 3100, 0.4),
      boneClick(0.07, 2400, 0.35),
      {
        waveform: 'noise',
        durationSec: 0.3,
        frequencyHz: WHITE,
        envelope: shaped(0.01, 0.25, 0, 0.04),
        gain: 0.35,
        filters: [lowpass(3000, 500)],
      },
      thump(0, 110, 55, 0.12, 0.3),
    ],
  },
};

export const ORC_RECIPES: RaceSfxRecipeGroup<'orc'> = {
  'combat.attack.single.orc': {
    seed: 601,
    layers: [
      { ...burst(0, 0.09, 0.45, [bandpass(400, 900, 1.2)]), envelope: shaped(0.02, 0.06, 0, 0.01) },
      thump(0.02, 115, 70, 0.12, 0.6),
      burst(0.02, 0.02, 0.3, [bandpass(900, undefined, 2)]),
    ],
  },
  'combat.attack.splash.orc': {
    seed: 602,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.32,
        frequencyHz: WHITE,
        drive: 2,
        tremolo: { rateHz: 13, depth: 0.35 },
        envelope: shaped(0.02, 0.2, 0.3, 0.08),
        gain: 0.55,
        filters: [lowpass(1400, 450)],
      },
      thump(0, 72, 40, 0.22, 0.7),
    ],
  },
  'combat.attack.chain.orc': {
    seed: 603,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.2,
        frequencyHz: 5000,
        tremolo: { rateHz: 38, depth: 0.7 },
        envelope: shaped(0.002, 0.16, 0.1, 0.03),
        gain: 0.45,
        filters: [highpass(1200)],
      },
      {
        waveform: 'square',
        durationSec: 0.18,
        frequencyHz: 55,
        drive: 2,
        envelope: hit(0.16),
        gain: 0.3,
        filters: [lowpass(900)],
      },
      thump(0, 90, 50, 0.12, 0.4),
    ],
  },
  'combat.attack.frost.orc': {
    seed: 604,
    layers: [
      { ...thump(0, 190, 95, 0.14, 0.5), vibrato: { rateHz: 22, depth: 0.15 } },
      { ...thump(0.12, 150, 80, 0.14, 0.4), vibrato: { rateHz: 18, depth: 0.12 } },
      { ...burst(0, 0.25, 0.3, [lowpass(450)]), envelope: shaped(0.02, 0.2, 0, 0.03) },
    ],
  },
  'combat.impact.orc': {
    seed: 605,
    layers: [thump(0, 95, 48, 0.12, 0.8), burst(0, 0.04, 0.4, [lowpass(350)])],
  },
  'combat.build.orc': {
    seed: 606,
    layers: [
      ...drum(0, 0.8),
      ...drum(0.14, 0.75),
      burst(0.26, 0.03, 0.35, [bandpass(800, undefined, 2)]),
      thump(0.26, 200, 120, 0.07, 0.35),
    ],
  },
  'combat.creep_death.orc': {
    seed: 607,
    layers: [
      {
        waveform: 'saw',
        durationSec: 0.2,
        frequencyHz: 160,
        frequencyEndHz: 85,
        drive: 1.5,
        envelope: shaped(0.01, 0.15, 0.2, 0.04),
        gain: 0.5,
        filters: [bandpass(700, undefined, 2)],
      },
      thump(0.05, 85, 45, 0.15, 0.5),
    ],
  },
};
