import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { NOTE, bandpass, burst, hit, lowpass, shaped, thump } from './recipeKit';
import {
  boneClick,
  chitinClick,
  rattle,
  snarl,
  stoneScrape,
  webHiss,
  wetTear,
  wingbeat,
} from './undeadVoices';

type UndeadLesserCreepSoundId = Extract<
  UndeadSoundId,
  `combat.creep.undead_${'skeleton' | 'ghoul' | 'crypt_fiend' | 'gargoyle'}.${string}`
>;

/** The lighter undead (tiers 1-3): skeleton, ghoul, crypt fiend and gargoyle. */
export const UNDEAD_LESSER_CREEP_RECIPES: Record<UndeadLesserCreepSoundId, SfxRecipe> = {
  // Skeleton (T1): bone clicks and dry rattles, light and short.
  'combat.creep.undead_skeleton.hit': {
    seed: 511,
    layers: [
      boneClick(0, 3000, 0.6),
      {
        waveform: 'triangle',
        durationSec: 0.04,
        frequencyHz: 520,
        frequencyEndHz: 380,
        envelope: hit(0.035),
        gain: 0.35,
      },
      boneClick(0.022, 2400, 0.3),
    ],
  },
  'combat.creep.undead_skeleton.death': {
    seed: 512,
    layers: [
      ...rattle(0, 7, 0.035, 2600, 0.55),
      thump(0.2, 190, 95, 0.08, 0.35),
      burst(0.2, 0.09, 0.2, [bandpass(1800, 900, 1.5)], 3000),
    ],
  },
  'combat.creep.undead_skeleton.escape': {
    seed: 513,
    layers: [
      ...rattle(0, 6, 0.028, 3100, 0.45),
      { ...thump(0.02, NOTE.A3 * 2, NOTE.A3 * 1.9, 0.09, 0.35), waveform: 'triangle' },
      { ...thump(0.15, NOTE.F3 * 2, NOTE.F3 * 1.9, 0.11, 0.35), waveform: 'triangle' },
    ],
  },
  'combat.creep.undead_skeleton.spawn': {
    seed: 514,
    layers: [
      ...[0, 0.07, 0.12, 0.155, 0.18, 0.2].map((startSec, index) =>
        boneClick(startSec, 2200 + index * 180, 0.3 + index * 0.05),
      ),
      {
        waveform: 'triangle',
        startSec: 0.12,
        durationSec: 0.16,
        frequencyHz: NOTE.D4,
        frequencyEndHz: NOTE.A4,
        envelope: shaped(0.02, 0.1, 0.2, 0.04),
        gain: 0.25,
      },
    ],
  },

  // Ghoul (T1): wet tearing and hungry snarls.
  'combat.creep.undead_ghoul.hit': {
    seed: 521,
    layers: [
      wetTear(0, 0.06, 0.55),
      snarl(0.005, 0.055, 190, 150, 0.3, 1300),
      thump(0, 115, 60, 0.06, 0.45),
    ],
  },
  'combat.creep.undead_ghoul.death': {
    seed: 522,
    layers: [
      snarl(0, 0.34, 210, 80, 0.5, 950),
      wetTear(0.02, 0.26, 0.4),
      thump(0.3, 100, 45, 0.1, 0.5),
    ],
  },
  'combat.creep.undead_ghoul.escape': {
    seed: 523,
    layers: [snarl(0, 0.12, 160, 220, 0.5, 720), snarl(0.16, 0.15, 200, 260, 0.55, 780)],
  },
  'combat.creep.undead_ghoul.spawn': {
    seed: 524,
    layers: [
      wetTear(0, 0.14, 0.25),
      burst(0, 0.08, 0.3, [lowpass(500)]),
      snarl(0.1, 0.24, 140, 210, 0.5, 520),
    ],
  },

  // Crypt fiend (T2): chitinous clicks and web hiss.
  'combat.creep.undead_crypt_fiend.hit': {
    seed: 531,
    layers: [
      ...chitinClick(0, 0.6, 5000),
      ...chitinClick(0.03, 0.4, 4600),
      thump(0, 160, 90, 0.06, 0.12),
    ],
  },
  'combat.creep.undead_crypt_fiend.death': {
    seed: 532,
    layers: [
      ...[0, 0.04, 0.07, 0.12, 0.17].flatMap((startSec, index) =>
        chitinClick(startSec, 0.5 - index * 0.06, 2100 - index * 180),
      ),
      {
        waveform: 'square',
        durationSec: 0.3,
        frequencyHz: 900,
        frequencyEndHz: 380,
        dutyCycle: 0.25,
        envelope: shaped(0.01, 0.2, 0.2, 0.08),
        gain: 0.18,
        filters: [bandpass(1500, 700, 2)],
      },
      webHiss(0.05, 0.36, 0.7),
    ],
  },
  'combat.creep.undead_crypt_fiend.escape': {
    seed: 533,
    layers: [
      ...[0, 0.03, 0.055, 0.09, 0.115, 0.15].flatMap((startSec, index) =>
        chitinClick(startSec, 0.45, 1700 + (index % 3) * 300),
      ),
      webHiss(0.1, 0.25, 0.7),
    ],
  },
  'combat.creep.undead_crypt_fiend.spawn': {
    seed: 534,
    layers: [
      { ...burst(0, 0.18, 0.4, [lowpass(600, 300)]), envelope: shaped(0.03, 0.1, 0.3, 0.05) },
      ...chitinClick(0.12, 0.45, 2000),
      ...chitinClick(0.16, 0.4, 2400),
      ...chitinClick(0.2, 0.35, 1900),
      webHiss(0.15, 0.22, 0.7),
    ],
  },

  // Gargoyle (T3, flier): stone scrape and leathery wingbeats.
  'combat.creep.undead_gargoyle.hit': {
    seed: 541,
    layers: [
      burst(0, 0.05, 0.6, [bandpass(1000, undefined, 1.5)], 1200),
      thump(0, 210, 120, 0.07, 0.5),
      burst(0.01, 0.03, 0.25, [bandpass(2600, undefined, 2)], 2500),
    ],
  },
  'combat.creep.undead_gargoyle.death': {
    seed: 542,
    layers: [
      ...wingbeat(0, 0.4),
      { ...stoneScrape(0.06, 0.26, 0.45), filters: [bandpass(1100, 700, 1.5)] },
      {
        waveform: 'noise',
        startSec: 0.28,
        durationSec: 0.18,
        frequencyHz: 900,
        envelope: hit(0.16),
        gain: 0.5,
        filters: [lowpass(2600, 900)],
      },
      thump(0.3, 120, 50, 0.16, 0.55),
    ],
  },
  'combat.creep.undead_gargoyle.escape': {
    seed: 543,
    layers: [
      ...wingbeat(0, 0.5),
      ...wingbeat(0.16, 0.5),
      {
        waveform: 'saw',
        startSec: 0.05,
        durationSec: 0.26,
        frequencyHz: 300,
        frequencyEndHz: 250,
        drive: 1.8,
        envelope: shaped(0.02, 0.16, 0.3, 0.06),
        gain: 0.22,
        filters: [bandpass(1100, undefined, 2.5)],
      },
      stoneScrape(0.05, 0.3, 0.2),
    ],
  },
  'combat.creep.undead_gargoyle.spawn': {
    seed: 544,
    layers: [
      burst(0, 0.06, 0.6, [bandpass(900, undefined, 1.2)], 1000),
      thump(0, 160, 80, 0.08, 0.45),
      stoneScrape(0.04, 0.14, 0.3),
      ...wingbeat(0.16, 0.45),
      ...wingbeat(0.3, 0.4),
    ],
  },
};
