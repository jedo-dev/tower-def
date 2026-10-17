import type { SfxLayer } from '../sfxRecipe.types';
import {
  NOTE,
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
import type { RaceSfxRecipeGroup } from './recipeGroups';

/** Glassy elven tone with a slow shimmer. */
function glass(frequencyHz: number, startSec: number, durationSec: number, gain: number): SfxLayer {
  return {
    waveform: 'sine',
    startSec,
    durationSec,
    frequencyHz,
    vibrato: { rateHz: 6.5, depth: 0.006 },
    envelope: shaped(0.015, durationSec * 0.8, 0, 0.05),
    gain,
  };
}

export const ELF_RECIPES: RaceSfxRecipeGroup<'elf'> = {
  'combat.attack.single.elf': {
    seed: 801,
    layers: [
      {
        waveform: 'triangle',
        durationSec: 0.16,
        frequencyHz: 270,
        frequencyEndHz: 240,
        vibrato: { rateHz: 30, depth: 0.01 },
        envelope: hit(0.15),
        gain: 0.45,
        filters: [lowpass(2200)],
      },
      {
        ...burst(0.01, 0.12, 0.25, [bandpass(3200, 2000, 1.3)]),
        envelope: shaped(0.03, 0.08, 0, 0.01),
      },
    ],
  },
  'combat.attack.splash.elf': {
    seed: 802,
    layers: [
      bell(NOTE.A5, 0, 0.28, 0.3, { ratio: 2, attackSec: 0.01 }),
      bell(NOTE.E6, 0.04, 0.26, 0.22, { ratio: 2, attackSec: 0.01 }),
      {
        waveform: 'noise',
        durationSec: 0.25,
        frequencyHz: WHITE,
        envelope: swell(0.06, 0.12),
        gain: 0.2,
        filters: [bandpass(2500, undefined, 0.8)],
      },
    ],
  },
  'combat.attack.frost.elf': {
    seed: 803,
    layers: [
      glass(NOTE.C6, 0, 0.28, 0.35),
      glass(NOTE.G6, 0.02, 0.25, 0.22),
      { ...burst(0, 0.2, 0.1, [highpass(5000)], 9000), envelope: shaped(0.02, 0.16, 0, 0.02) },
    ],
  },
  'combat.attack.poison.elf': {
    seed: 804,
    layers: [
      {
        ...burst(0, 0.07, 0.4, [bandpass(1800, 4200, 2.5)]),
        envelope: shaped(0.01, 0.06, 0, 0.005),
      },
      {
        waveform: 'triangle',
        durationSec: 0.1,
        frequencyHz: 520,
        frequencyEndHz: 370,
        envelope: hit(0.09),
        gain: 0.3,
      },
      burst(0.06, 0.015, 0.25, [highpass(1500)], 4000),
    ],
  },
  'combat.impact.elf': {
    seed: 805,
    layers: [
      bell(NOTE.A6, 0, 0.1, 0.3, { ratio: 2, index: 1 }),
      burst(0, 0.015, 0.2, [highpass(3000)]),
      thump(0, 220, 150, 0.05, 0.2),
    ],
  },
  'combat.build.elf': {
    seed: 806,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.22,
        frequencyHz: WHITE,
        tremolo: { rateHz: 28, depth: 0.8 },
        envelope: shaped(0.03, 0.15, 0.1, 0.04),
        gain: 0.3,
        filters: [bandpass(3000)],
      },
      bell(NOTE.D5, 0.12, 0.26, 0.3, { ratio: 2, attackSec: 0.008 }),
      bell(NOTE.A5, 0.2, 0.2, 0.25, { ratio: 2, attackSec: 0.008 }),
    ],
  },
  'combat.creep_death.elf': {
    seed: 807,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.28,
        frequencyHz: WHITE,
        envelope: shaped(0.05, 0.18, 0.1, 0.05),
        gain: 0.3,
        filters: [bandpass(1500, 600, 1.2)],
      },
      {
        waveform: 'fm',
        durationSec: 0.28,
        frequencyHz: NOTE.D6,
        frequencyEndHz: NOTE.A5,
        fm: { ratio: 2, index: 0.8, indexEnd: 0 },
        envelope: hit(0.26, 0.01),
        gain: 0.3,
      },
    ],
  },
};
