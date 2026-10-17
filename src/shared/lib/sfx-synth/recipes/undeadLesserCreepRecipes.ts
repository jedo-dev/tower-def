import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { bandpass, burst, hit, lowpass, shaped, thump } from './recipeKit';
import { VOWEL_ZOMBIE_OO, VOWEL_ZOMBIE_UH, boneKnock, vowelWithBreath } from './undeadVocalTract';
import {
  boneClick,
  chitinClick,
  gurgle,
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
  // Skeleton (T1): dry bones only, clicks and hollow knocks, no voice.
  'combat.creep.undead_skeleton.hit': {
    seed: 515,
    layers: [
      ...boneKnock(0, 1900, 0.7),
      boneClick(0.018, 3200, 0.35),
      ...boneKnock(0.03, 2600, 0.3, 800),
    ],
  },
  'combat.creep.undead_skeleton.death': {
    seed: 516,
    // A pile collapsing: 12 hits over 0.4 s, dense first, thinning out.
    layers: Array.from({ length: 12 }, (_, index) => {
      const startSec = 0.4 * Math.pow(index / 11, 1.7);
      const gain = 0.75 - index * 0.04;
      return index % 3 === 1
        ? [boneClick(startSec, 2600 + (index % 4) * 300, gain * 0.7)]
        : boneKnock(startSec, 1200 + ((index * 7) % 9) * 200, gain, 500 + (index % 3) * 120);
    }).flat(),
  },
  'combat.creep.undead_skeleton.escape': {
    seed: 517,
    // A rattling trot: three gallop beats of knock, click, knock.
    layers: [0, 0.17, 0.34].flatMap((beatSec, beat) => [
      ...boneKnock(beatSec, 1500 + beat * 150, 0.6, 600),
      boneClick(beatSec + 0.035, 3000, 0.35),
      ...boneKnock(beatSec + 0.06, 2300 - beat * 100, 0.4, 750),
      boneClick(beatSec + 0.085, 2600, 0.2),
    ]),
  },
  'combat.creep.undead_skeleton.spawn': {
    seed: 518,
    // Bones finding each other faster and faster, locking into one knock.
    layers: [
      ...[0, 0.085, 0.155, 0.21, 0.255, 0.29, 0.318, 0.34].map((startSec, index) =>
        boneClick(startSec, 2200 + index * 160, 0.25 + index * 0.04),
      ),
      ...boneKnock(0.37, 1100, 0.9, 420),
      ...boneKnock(0.372, 2100, 0.3, 700),
    ],
  },

  // Ghoul (T1): a zombie, wet low moans on an exhale and gurgling.
  'combat.creep.undead_ghoul.hit': {
    seed: 525,
    layers: [
      // Wet bite: a crunchy chomp and a teeth click.
      burst(0, 0.045, 0.55, [lowpass(1400, 600)], 4000),
      burst(0.004, 0.012, 0.3, [bandpass(2600, undefined, 3)], 9000),
      thump(0, 120, 70, 0.05, 0.35),
      ...vowelWithBreath(
        {
          startSec: 0.02,
          durationSec: 0.09,
          fromHz: 108,
          toHz: 86,
          vowel: VOWEL_ZOMBIE_UH,
          envelope: shaped(0.008, 0.05, 0.4, 0.03),
          gain: 1.1,
          drive: 1.4,
          jitter: { rateHz: 30, depth: 0.04 },
        },
        0.35,
      ),
    ],
  },
  'combat.creep.undead_ghoul.death': {
    seed: 526,
    // Choking: a moan that sinks while its throat closes and bubbles.
    layers: [
      ...vowelWithBreath(
        {
          startSec: 0,
          durationSec: 0.6,
          fromHz: 105,
          toHz: 55,
          sweepCurve: 1.4,
          vowel: VOWEL_ZOMBIE_UH,
          vowelEnd: VOWEL_ZOMBIE_OO,
          envelope: shaped(0.03, 0.3, 0.6, 0.2),
          gain: 1.1,
          drive: 1.2,
          jitter: { rateHz: 14, depth: 0.05 },
          tremolo: { rateHz: 13, depth: 0.55 },
        },
        0.45,
      ),
      gurgle(0.15, 0.4, 150, 80, 0.25),
      burst(0.5, 0.12, 0.3, [lowpass(500)], 3000),
      thump(0.52, 90, 45, 0.12, 0.4),
    ],
  },
  'combat.creep.undead_ghoul.escape': {
    seed: 527,
    // Hungry drawn moan "uuuh-aah" on a long exhale.
    layers: [
      ...vowelWithBreath(
        {
          startSec: 0,
          durationSec: 0.62,
          fromHz: 84,
          toHz: 100,
          vowel: VOWEL_ZOMBIE_OO,
          vowelEnd: VOWEL_ZOMBIE_UH,
          envelope: shaped(0.12, 0.2, 0.75, 0.2),
          gain: 1,
          drive: 1,
          vibrato: { rateHz: 3, depth: 0.02 },
          jitter: { rateHz: 9, depth: 0.03 },
        },
        0.5,
      ),
      gurgle(0.32, 0.26, 120, 100, 0.12),
    ],
  },
  'combat.creep.undead_ghoul.spawn': {
    seed: 528,
    // Wet smack out of the ground, then a groan rising from the gut.
    layers: [
      burst(0, 0.06, 0.6, [lowpass(900, 400)], 3500),
      thump(0, 110, 55, 0.07, 0.5),
      wetTear(0.01, 0.08, 0.2),
      ...vowelWithBreath(
        {
          startSec: 0.06,
          durationSec: 0.56,
          fromHz: 72,
          toHz: 106,
          sweepCurve: 0.8,
          vowel: VOWEL_ZOMBIE_OO,
          vowelEnd: VOWEL_ZOMBIE_UH,
          envelope: shaped(0.1, 0.2, 0.7, 0.18),
          gain: 1,
          drive: 1.3,
          jitter: { rateHz: 11, depth: 0.04 },
        },
        0.45,
      ),
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
