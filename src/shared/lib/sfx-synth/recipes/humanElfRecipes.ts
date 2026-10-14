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
