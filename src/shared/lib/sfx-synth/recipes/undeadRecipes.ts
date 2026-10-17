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
import { UNDEAD_GREATER_CREEP_RECIPES } from './undeadGreaterCreepRecipes';
import { UNDEAD_LESSER_CREEP_RECIPES } from './undeadLesserCreepRecipes';
import { UNDEAD_TOWER_RECIPES } from './undeadTowerRecipes';
import { boneClick, hiss } from './undeadVoices';

/**
 * Race-wide undead clips. Each creature's and tower's own clips live in the
 * creep and tower recipe files, built from the vocabulary in `undeadVoices.ts`.
 */
export const UNDEAD_RECIPES: RaceSfxRecipeGroup<'undead'> = {
  ...UNDEAD_LESSER_CREEP_RECIPES,
  ...UNDEAD_GREATER_CREEP_RECIPES,
  ...UNDEAD_TOWER_RECIPES,

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
