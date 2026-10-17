import type { SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, bell, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';
import type { RaceSfxRecipeGroup } from './recipeGroups';
import { HUMAN_CREEP_RECIPES } from './humanCreepRecipes';
import { clink, glass, trumpet } from './humanSoundLayers';

/** Struck steel: inharmonic FM with a fast-decaying edge. */
function clang(frequencyHz: number, startSec: number, gain: number, ratio = 3.7): SfxLayer {
  return {
    waveform: 'fm',
    startSec,
    durationSec: 0.15,
    frequencyHz,
    fm: { ratio, index: 2.5, indexEnd: 0.3 },
    envelope: hit(0.14),
    gain,
    filters: [lowpass(6000)],
  };
}

export const HUMAN_RECIPES: RaceSfxRecipeGroup<'human'> = {
  'combat.attack.single.human': {
    seed: 701,
    layers: [
      {
        waveform: 'square',
        durationSec: 0.1,
        frequencyHz: 340,
        frequencyEndHz: 230,
        dutyCycle: 0.3,
        envelope: hit(0.09),
        gain: 0.3,
        filters: [lowpass(3200), highpass(250)],
      },
      bell(2400, 0, 0.03, 0.3, { ratio: 1.5, index: 1 }),
      burst(0, 0.02, 0.3, [bandpass(2000, undefined, 1.5)]),
    ],
  },
  'combat.attack.splash.human': {
    seed: 702,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.38,
        frequencyHz: WHITE,
        drive: 1.5,
        envelope: shaped(0.003, 0.3, 0.05, 0.06),
        gain: 0.6,
        filters: [lowpass(2000, 280)],
      },
      thump(0, 72, 34, 0.3, 0.8),
      burst(0, 0.02, 0.3, [highpass(2000)]),
    ],
  },
  'combat.attack.poison.human': {
    seed: 703,
    layers: [
      bell(1900, 0, 0.06, 0.35, { ratio: 1.5, index: 1.5 }),
      thump(0, 600, 250, 0.04, 0.35),
      {
        waveform: 'noise',
        startSec: 0.04,
        durationSec: 0.2,
        frequencyHz: WHITE,
        tremolo: { rateHz: 25, depth: 0.5 },
        envelope: shaped(0.02, 0.15, 0.1, 0.03),
        gain: 0.15,
        filters: [highpass(2800), lowpass(7000)],
      },
    ],
  },
  'combat.impact.human': {
    seed: 704,
    layers: [clang(620, 0, 0.4), burst(0, 0.015, 0.3, [bandpass(3000, undefined, 1.5)])],
  },
  'combat.build.human': {
    seed: 705,
    layers: [
      clang(880, 0, 0.4, 2.4),
      thump(0, 140, 80, 0.06, 0.3),
      clang(830, 0.14, 0.38, 2.4),
      thump(0.14, 140, 80, 0.06, 0.3),
    ],
  },
  'combat.creep_death.human': {
    seed: 706,
    layers: [
      clang(460, 0, 0.3, 2.9),
      clang(380, 0.05, 0.25, 2.9),
      burst(0.08, 0.1, 0.4, [lowpass(700)]),
      thump(0.08, 120, 60, 0.1, 0.35),
    ],
  },
  ...HUMAN_CREEP_RECIPES,

  // Guard Archer Tower: a longbow twang and an arrow thudding home.
  'combat.tower.human_guard_archer_tower.attack': {
    seed: 791,
    layers: [
      {
        waveform: 'triangle',
        durationSec: 0.14,
        frequencyHz: 190,
        frequencyEndHz: 150,
        vibrato: { rateHz: 30, depth: 0.02 },
        envelope: hit(0.13),
        gain: 0.55,
        filters: [lowpass(2400)],
      },
      { ...clink(760, 0, 0.08, 0.15), fm: { ratio: 2, index: 1.5, indexEnd: 0.1 } },
      burst(0.01, 0.08, 0.2, [bandpass(3000, 1500, 1.5)]),
    ],
  },
  'combat.tower.human_guard_archer_tower.impact': {
    seed: 792,
    layers: [
      thump(0, 260, 120, 0.05, 0.7),
      burst(0, 0.02, 0.4, [bandpass(1500, undefined, 2)], 7000),
      {
        waveform: 'triangle',
        startSec: 0.01,
        durationSec: 0.12,
        frequencyHz: 410,
        tremolo: { rateHz: 40, depth: 0.8 },
        envelope: hit(0.11),
        gain: 0.25,
        filters: [lowpass(1500)],
      },
    ],
  },

  // Cannon Bastion: a deep cannon boom and falling rubble.
  'combat.tower.human_cannon_bastion.attack': {
    seed: 793,
    layers: [
      thump(0, 60, 28, 0.19, 0.9),
      {
        waveform: 'noise',
        durationSec: 0.19,
        frequencyHz: WHITE,
        drive: 1.5,
        envelope: shaped(0.002, 0.14, 0.05, 0.04),
        gain: 0.6,
        filters: [lowpass(900, 150)],
      },
      burst(0, 0.015, 0.15, [highpass(2500)]),
    ],
  },
  'combat.tower.human_cannon_bastion.impact': {
    seed: 794,
    layers: [
      thump(0, 90, 40, 0.12, 0.7),
      burst(0, 0.06, 0.45, [lowpass(1500)], 1200),
      burst(0.04, 0.04, 0.3, [bandpass(1200, undefined, 1.5)], 2500),
      burst(0.08, 0.04, 0.25, [bandpass(900, undefined, 1.5)], 2500),
      burst(0.13, 0.04, 0.2, [bandpass(1400, undefined, 1.5)], 2500),
    ],
  },

  // Alchemist Tower: a glass clink with a fizz, landing as an acid splash.
  'combat.tower.human_alchemist_tower.attack': {
    seed: 795,
    layers: [
      glass(3200, 0, 0.09, 0.35),
      {
        waveform: 'noise',
        startSec: 0.03,
        durationSec: 0.15,
        frequencyHz: WHITE,
        tremolo: { rateHz: 45, depth: 0.6 },
        envelope: shaped(0.02, 0.1, 0.2, 0.03),
        gain: 0.25,
        filters: [highpass(4000)],
      },
    ],
  },
  'combat.tower.human_alchemist_tower.impact': {
    seed: 796,
    layers: [
      burst(0, 0.06, 0.5, [bandpass(900, 2500, 1.5)]),
      clink(4100, 0, 0.05, 0.2),
      clink(5200, 0.02, 0.05, 0.15),
      {
        waveform: 'noise',
        startSec: 0.03,
        durationSec: 0.15,
        frequencyHz: 9000,
        tremolo: { rateHz: 60, depth: 0.7 },
        envelope: shaped(0.01, 0.1, 0.2, 0.03),
        gain: 0.3,
        filters: [highpass(5000)],
      },
    ],
  },

  // Guard Post: a short horn cue and a ringing steel answer.
  'combat.tower.human_guard_post.attack': {
    seed: 797,
    layers: [
      { ...trumpet(0, 0.18, 146.83, 0.5), filters: [bandpass(900, undefined, 1.2), lowpass(2500)] },
      {
        ...trumpet(0.02, 0.16, 220, 0.25),
        filters: [bandpass(900, undefined, 1.2), lowpass(2500)],
      },
    ],
  },
  'combat.tower.human_guard_post.impact': {
    seed: 798,
    layers: [bell(1174.66, 0, 0.19, 0.35, { ratio: 2, index: 1.2 }), clang(880, 0, 0.25, 2.4)],
  },
};
