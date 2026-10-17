import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SfxEcho, SfxRecipe } from '../sfxRecipe.types';
import { NOTE, bandpass, bell, burst, highpass, lowpass, shaped, swell, thump } from './recipeKit';
import {
  VOWEL_MURMUR_AH,
  VOWEL_MURMUR_EE,
  VOWEL_MURMUR_OH,
  VOWEL_MURMUR_UH,
  VOWEL_SOPRANO_AH,
  breathVowel,
  consonant,
  murmur,
  soprano,
  voicedVowel,
} from './undeadVocalTract';
import {
  airyBreath,
  bellow,
  chainClink,
  coldRoar,
  gurgle,
  iceCrackle,
  staffTap,
  wetTear,
  wingbeat,
} from './undeadVoices';

/** The necromancer speaks under his breath: quieter than the default RMS 0.2. */
const NECROMANCER_LOUDNESS = 0.12;

/** A short hall behind the banshee's voice. */
const BANSHEE_HALL: SfxEcho = { delaySec: 0.037, feedback: 0.55, mix: 0.3 };

type UndeadGreaterCreepSoundId = Extract<
  UndeadSoundId,
  `combat.creep.undead_${'abomination' | 'necromancer' | 'banshee' | 'frost_wyrm'}.${string}`
>;

/** The greater undead (tiers 4-6): abomination, necromancer, banshee and frost wyrm. */
export const UNDEAD_GREATER_CREEP_RECIPES: Record<UndeadGreaterCreepSoundId, SfxRecipe> = {
  // Abomination (T4): heavy wet thuds, chains and a gurgling bellow.
  'combat.creep.undead_abomination.hit': {
    seed: 551,
    layers: [
      thump(0, 85, 40, 0.09, 0.85),
      burst(0, 0.06, 0.4, [lowpass(450)]),
      chainClink(0.01, 950, 0.03),
    ],
  },
  'combat.creep.undead_abomination.death': {
    seed: 552,
    layers: [
      bellow(0, 0.46, 115, 52, 0.55),
      gurgle(0.05, 0.4, 140, 70, 0.35),
      chainClink(0.3, 980, 0.09),
      chainClink(0.355, 1180, 0.07),
      thump(0.4, 72, 32, 0.16, 0.8),
      wetTear(0.4, 0.14, 0.06),
    ],
  },
  'combat.creep.undead_abomination.escape': {
    seed: 553,
    layers: [
      { ...bellow(0, 0.4, 85, 120, 0.55), filters: [bandpass(340, 260, 1.6)] },
      gurgle(0.08, 0.3, 120, 160, 0.3),
      chainClink(0.02, 1050, 0.05),
      chainClink(0.12, 900, 0.045),
      chainClink(0.24, 1200, 0.04),
      thump(0, 80, 40, 0.12, 0.5),
    ],
  },
  'combat.creep.undead_abomination.spawn': {
    seed: 554,
    layers: [
      thump(0, 78, 36, 0.14, 0.8),
      thump(0.2, 74, 34, 0.14, 0.8),
      ...[0.03, 0.08, 0.23, 0.27].map((startSec, index) =>
        chainClink(startSec, 900 + index * 90, 0.07),
      ),
      gurgle(0.18, 0.3, 110, 90, 0.35),
    ],
  },

  // Necromancer (T5): a quiet, tired male voice, murmuring and breathy.
  'combat.creep.undead_necromancer.hit': {
    seed: 565,
    loudness: NECROMANCER_LOUDNESS,
    layers: [...murmur(0, 0.1, 118, 92, VOWEL_MURMUR_UH, 0.9, 0.5), thump(0, 130, 80, 0.05, 0.2)],
  },
  'combat.creep.undead_necromancer.death': {
    seed: 566,
    loudness: NECROMANCER_LOUDNESS,
    // A last exhale "haaah..." with a faint tonal sigh under it.
    layers: [
      breathVowel({
        startSec: 0,
        durationSec: 0.64,
        vowel: VOWEL_MURMUR_AH,
        vowelEnd: VOWEL_MURMUR_UH,
        envelope: shaped(0.05, 0.25, 0.55, 0.3),
        gain: 1.1,
      }),
      voicedVowel({
        startSec: 0.06,
        durationSec: 0.46,
        fromHz: 112,
        toHz: 78,
        vowel: VOWEL_MURMUR_AH,
        vowelEnd: VOWEL_MURMUR_UH,
        envelope: shaped(0.08, 0.2, 0.5, 0.18),
        gain: 1.1,
        jitter: { rateHz: 9, depth: 0.05 },
        brightnessHz: 2200,
      }),
    ],
  },
  'combat.creep.undead_necromancer.escape': {
    seed: 567,
    loudness: NECROMANCER_LOUDNESS,
    // Murmured incantation: four syllables "mo-ta-nis-ul".
    layers: [
      ...murmur(0, 0.13, 104, 100, VOWEL_MURMUR_OH, 0.7, 0.6),
      consonant(0.145, 0.025, 2600),
      ...murmur(0.15, 0.12, 110, 104, VOWEL_MURMUR_AH, 0.75, 0.6),
      ...murmur(0.29, 0.12, 100, 98, VOWEL_MURMUR_EE, 0.65, 0.6),
      consonant(0.39, 0.07, 5200),
      ...murmur(0.47, 0.16, 98, 84, VOWEL_MURMUR_UH, 0.7, 0.65),
    ],
  },
  'combat.creep.undead_necromancer.spawn': {
    seed: 568,
    loudness: NECROMANCER_LOUDNESS,
    // A whispered word "sha-ah", then the staff touches the ground.
    layers: [
      consonant(0, 0.09, 3200),
      breathVowel({
        startSec: 0.06,
        durationSec: 0.3,
        vowel: VOWEL_MURMUR_AH,
        vowelEnd: VOWEL_MURMUR_EE,
        envelope: shaped(0.04, 0.12, 0.6, 0.12),
        gain: 1.6,
      }),
      ...staffTap(0.4, 0.35),
    ],
  },

  // Banshee (T5, flier): an operatic soprano singing "aah" with vibrato.
  'combat.creep.undead_banshee.hit': {
    seed: 575,
    echo: { delaySec: 0.03, feedback: 0.3, mix: 0.25 },
    tailSec: 0.03,
    // A wail cut off short.
    layers: soprano(0, 0.085, 880, 800, shaped(0.012, 0.04, 0.6, 0.02), 0.05),
  },
  'combat.creep.undead_banshee.death': {
    seed: 576,
    echo: BANSHEE_HALL,
    tailSec: 0.17,
    // A long wail sliding down an octave as her vibrato comes apart.
    layers: soprano(0, 0.72, 698, 349, shaped(0.06, 0.25, 0.75, 0.14), 0.2, {
      sweepCurve: 1.1,
      vibrato: { rateHz: 5.5, depth: 0.02, depthEnd: 0.075 },
    }),
  },
  'combat.creep.undead_banshee.escape': {
    seed: 577,
    echo: BANSHEE_HALL,
    tailSec: 0.15,
    // A lament rising a fifth.
    layers: soprano(0, 0.54, 523, 784, shaped(0.08, 0.2, 0.8, 0.16), 0.2, { sweepCurve: 1.8 }),
  },
  'combat.creep.undead_banshee.spawn': {
    seed: 578,
    echo: BANSHEE_HALL,
    tailSec: 0.14,
    // A breath swelling into a held note.
    layers: [
      breathVowel({
        startSec: 0,
        durationSec: 0.5,
        vowel: VOWEL_SOPRANO_AH,
        envelope: shaped(0.18, 0.15, 0.5, 0.15),
        gain: 0.9,
      }),
      ...soprano(0.1, 0.46, 659, 659, swell(0.26, 0.14), 0.15),
    ],
  },

  // Frost wyrm (T6, flier): an icy crackle and a deep, cold roar.
  'combat.creep.undead_frost_wyrm.hit': {
    seed: 581,
    layers: [
      iceCrackle(0, 0.07, 0.3),
      thump(0, 75, 40, 0.09, 0.7),
      burst(0, 0.03, 0.3, [highpass(5000)], 9000),
    ],
  },
  'combat.creep.undead_frost_wyrm.death': {
    seed: 582,
    layers: [
      coldRoar(0, 0.5, 92, 44, 0.6),
      airyBreath(0, 0.4, 3200, 0.08),
      iceCrackle(0.32, 0.24, 0.3),
      bell(NOTE.A6, 0.34, 0.2, 0.15, { ratio: 4.2, index: 2 }),
      thump(0.36, 62, 30, 0.2, 0.7),
    ],
  },
  'combat.creep.undead_frost_wyrm.escape': {
    seed: 583,
    layers: [
      coldRoar(0, 0.52, 68, 98, 0.6),
      airyBreath(0.05, 0.45, 3500, 0.06),
      iceCrackle(0.1, 0.3, 0.08),
    ],
  },
  'combat.creep.undead_frost_wyrm.spawn': {
    seed: 584,
    layers: [
      ...wingbeat(0, 0.6, 320),
      ...wingbeat(0.2, 0.6, 300),
      coldRoar(0.12, 0.42, 75, 62, 0.45),
      iceCrackle(0.3, 0.24, 0.3),
      burst(0, 0.5, 0.15, [lowpass(250)]),
    ],
  },
};
