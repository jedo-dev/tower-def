import type { SfxLayer } from '../sfxRecipe.types';
import { WHITE, bandpass, bell, burst, highpass, hit, lowpass, shaped, thump } from './recipeKit';
import type { RaceSfxRecipeGroup } from './recipeGroups';

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
};
