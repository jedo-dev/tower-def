import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { NOTE, bandpass, bell, burst, highpass, lowpass, thump } from './recipeKit';
import {
  airyBreath,
  bellow,
  chainClink,
  chant,
  coldRoar,
  gurgle,
  iceCrackle,
  shimmer,
  staffTap,
  wail,
  wetTear,
  whisper,
  wingbeat,
} from './undeadVoices';

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

  // Necromancer (T5): a whispering necrotic chant and a staff tap.
  'combat.creep.undead_necromancer.hit': {
    seed: 561,
    layers: [
      { ...whisper(0, 0.07, 1300, 0.5), tremolo: { rateHz: 30, depth: 0.5 } },
      thump(0, 150, 85, 0.06, 0.45),
      burst(0, 0.02, 0.2, [bandpass(1200, undefined, 3)], 8000),
    ],
  },
  'combat.creep.undead_necromancer.death': {
    seed: 562,
    layers: [
      whisper(0, 0.38, 2700, 0.5),
      { ...chant(0, 0.4, NOTE.A3, 0.3), frequencyEndHz: NOTE.D3 },
      ...staffTap(0.4, 0.5),
      ...staffTap(0.46, 0.3),
      airyBreath(0.3, 0.24, 900, 0.2),
    ],
  },
  'combat.creep.undead_necromancer.escape': {
    seed: 563,
    layers: [
      ...staffTap(0, 0.5),
      chant(0.03, 0.2, NOTE.D3, 0.3),
      chant(0.21, 0.24, NOTE.F3, 0.3),
      whisper(0.03, 0.42, 1900, 0.4),
    ],
  },
  'combat.creep.undead_necromancer.spawn': {
    seed: 564,
    layers: [
      ...staffTap(0, 0.55),
      chant(0.05, 0.42, NOTE.D3, 0.28),
      chant(0.12, 0.35, NOTE.A3, 0.18),
      whisper(0.05, 0.44, 2800, 0.45),
    ],
  },

  // Banshee (T5, flier): an airy wail and a glassy shimmer.
  'combat.creep.undead_banshee.hit': {
    seed: 571,
    layers: [
      shimmer(0, 0.08, NOTE.D6, 0.35),
      airyBreath(0, 0.07, 4800, 0.4),
      wail(0, 0.07, NOTE.A5, NOTE.F4 * 2, 0.2),
    ],
  },
  'combat.creep.undead_banshee.death': {
    seed: 572,
    layers: [
      wail(0, 0.52, NOTE.A5, NOTE.A4, 0.45),
      airyBreath(0, 0.5, 2400, 0.3),
      shimmer(0.05, 0.45, NOTE.D6, 0.2),
      shimmer(0.12, 0.4, NOTE.A6 * 0.985, 0.12),
    ],
  },
  'combat.creep.undead_banshee.escape': {
    seed: 573,
    layers: [
      wail(0, 0.44, NOTE.A4, NOTE.D5, 0.45),
      airyBreath(0, 0.42, 2000, 0.25),
      shimmer(0.18, 0.26, NOTE.A6, 0.18),
    ],
  },
  'combat.creep.undead_banshee.spawn': {
    seed: 574,
    layers: [
      airyBreath(0, 0.5, 2000, 0.4),
      wail(0.08, 0.4, NOTE.D5, NOTE.F4 * 2, 0.35),
      shimmer(0.2, 0.3, NOTE.D6, 0.2),
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
