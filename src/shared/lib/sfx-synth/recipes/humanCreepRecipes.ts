import type { HumanSoundId } from '../../../types/sound-ids';
import type { SfxRecipe } from '../sfxRecipe.types';
import { WHITE, bandpass, burst, hit, lowpass, shaped, thump } from './recipeKit';
import {
  chainmail,
  clink,
  creak,
  glass,
  hoof,
  ironWheels,
  knock,
  plate,
  powderCrack,
  screech,
  slap,
  trumpet,
  voice,
  whoosh,
  wingbeat,
} from './humanSoundLayers';

/** Recipes of the per-creature human ids (`combat.creep.human_*`). */
export type HumanCreepSoundId = Extract<HumanSoundId, `combat.creep.${string}`>;

export const HUMAN_CREEP_RECIPES: Record<HumanCreepSoundId, SfxRecipe> = {
  // Militia: light leather and a short, rough shout.
  'combat.creep.human_militia.hit': {
    seed: 711,
    layers: [...slap(0, 0.7), { ...voice(0.01, 0.06, 260, 220, 0.25), envelope: hit(0.05) }],
  },
  'combat.creep.human_militia.death': {
    seed: 712,
    layers: [voice(0, 0.32, 280, 150, 0.55, 850), ...slap(0.28, 0.6), ...slap(0.36, 0.35)],
  },
  'combat.creep.human_militia.escape': {
    seed: 713,
    layers: [voice(0, 0.11, 300, 290, 0.5), voice(0.15, 0.14, 330, 360, 0.55), ...slap(0, 0.3)],
  },
  'combat.creep.human_militia.spawn': {
    seed: 714,
    layers: [voice(0.05, 0.2, 220, 320, 0.5), ...slap(0, 0.5), ...slap(0.12, 0.45)],
  },

  // Peasant: wooden tool knocks and a thin yelp.
  'combat.creep.human_peasant.hit': {
    seed: 721,
    layers: [...knock(0, 0.7), { ...voice(0.01, 0.05, 620, 800, 0.2, 1700), envelope: hit(0.04) }],
  },
  'combat.creep.human_peasant.death': {
    seed: 722,
    layers: [
      voice(0, 0.12, 640, 900, 0.45, 2000),
      voice(0.1, 0.22, 860, 380, 0.45, 1900),
      ...knock(0.3, 0.6, 380),
      ...knock(0.38, 0.4, 330),
    ],
  },
  'combat.creep.human_peasant.escape': {
    seed: 723,
    layers: [
      voice(0, 0.07, 600, 720, 0.4, 1500),
      voice(0.1, 0.07, 640, 760, 0.4, 1500),
      voice(0.2, 0.1, 680, 860, 0.45, 1500),
      ...knock(0, 0.3, 460),
    ],
  },
  'combat.creep.human_peasant.spawn': {
    seed: 724,
    layers: [
      ...knock(0, 0.55, 400),
      ...knock(0.1, 0.5, 450),
      ...knock(0.2, 0.45, 400),
      voice(0.26, 0.1, 520, 640, 0.35, 1600),
    ],
  },

  // Footman: a shield thunk, steel clink and chainmail.
  'combat.creep.human_footman.hit': {
    seed: 731,
    layers: [
      thump(0, 180, 90, 0.07, 0.8),
      burst(0, 0.03, 0.4, [lowpass(900)]),
      clink(1400, 0.005, 0.07, 0.25),
    ],
  },
  'combat.creep.human_footman.death': {
    seed: 732,
    layers: [
      voice(0, 0.2, 200, 120, 0.4, 900),
      chainmail(0.05, 0.35, 0.22),
      plate(520, 0.08, 0.2, 0.25),
      thump(0.3, 150, 70, 0.12, 0.6),
    ],
  },
  'combat.creep.human_footman.escape': {
    seed: 733,
    layers: [
      thump(0, 190, 95, 0.08, 0.6),
      thump(0.14, 190, 95, 0.08, 0.6),
      clink(1500, 0.14, 0.12, 0.3),
      chainmail(0, 0.28, 0.2),
    ],
  },
  'combat.creep.human_footman.spawn': {
    seed: 734,
    layers: [
      chainmail(0, 0.3, 0.35),
      whoosh(0.08, 0.16, 2000, 5000, 0.25),
      clink(1600, 0.24, 0.16, 0.3),
    ],
  },

  // Rifleman: powder cracks and brass.
  'combat.creep.human_rifleman.hit': {
    seed: 741,
    layers: [thump(0, 200, 110, 0.06, 0.6), clink(2200, 0, 0.08, 0.35)],
  },
  'combat.creep.human_rifleman.death': {
    seed: 742,
    layers: [
      ...powderCrack(0, 0.6),
      voice(0.05, 0.2, 240, 140, 0.3, 1000),
      clink(3000, 0.22, 0.12, 0.25),
      clink(3600, 0.3, 0.12, 0.2),
      clink(3300, 0.37, 0.1, 0.15),
    ],
  },
  'combat.creep.human_rifleman.escape': {
    seed: 743,
    layers: [...powderCrack(0, 0.6), clink(2600, 0.14, 0.12, 0.3), clink(3100, 0.22, 0.12, 0.25)],
  },
  'combat.creep.human_rifleman.spawn': {
    seed: 744,
    layers: [
      burst(0, 0.1, 0.3, [bandpass(1500, 2500, 2)]),
      burst(0.12, 0.1, 0.3, [bandpass(2500, 1500, 2)]),
      clink(2400, 0.22, 0.1, 0.3),
      ...powderCrack(0.3, 0.45),
    ],
  },

  // Siege engine: creaking timber, iron wheels, a heavy boom on death.
  'combat.creep.human_siege_engine.hit': {
    seed: 751,
    layers: [
      thump(0, 110, 60, 0.09, 0.8),
      burst(0, 0.05, 0.4, [bandpass(600, undefined, 1.5)], 2000),
    ],
  },
  'combat.creep.human_siege_engine.death': {
    seed: 752,
    layers: [
      thump(0, 70, 30, 0.5, 0.9),
      {
        waveform: 'noise',
        durationSec: 0.45,
        frequencyHz: WHITE,
        drive: 0.5,
        envelope: shaped(0.004, 0.3, 0.1, 0.12),
        gain: 0.6,
        filters: [lowpass(800, 200)],
      },
      {
        ...burst(0.05, 0.3, 0.3, [bandpass(1500, undefined, 1.5)], 3000),
        tremolo: { rateHz: 19, depth: 0.7 },
      },
    ],
  },
  'combat.creep.human_siege_engine.escape': {
    seed: 753,
    layers: [creak(0, 0.35, 90, 0.5), ironWheels(0, 0.4, 0.35), plate(330, 0.3, 0.15, 0.2)],
  },
  'combat.creep.human_siege_engine.spawn': {
    seed: 754,
    layers: [
      {
        waveform: 'square',
        durationSec: 0.5,
        frequencyHz: 55,
        tremolo: { rateHz: 9, depth: 0.6 },
        envelope: shaped(0.08, 0.2, 0.6, 0.15),
        gain: 0.35,
        filters: [lowpass(400)],
      },
      ironWheels(0, 0.5, 0.3),
      creak(0.1, 0.3, 75, 0.35),
    ],
  },

  // Knight: plate clang and hooves, a trumpet call on escape.
  'combat.creep.human_knight.hit': {
    seed: 761,
    layers: [plate(700, 0, 0.09, 0.45), thump(0, 150, 80, 0.07, 0.5)],
  },
  'combat.creep.human_knight.death': {
    seed: 762,
    layers: [
      plate(450, 0, 0.2, 0.4),
      plate(340, 0.12, 0.2, 0.35),
      plate(300, 0.25, 0.25, 0.3),
      burst(0, 0.15, 0.25, [bandpass(900, undefined, 1.5)]),
      thump(0.3, 110, 45, 0.2, 0.7),
    ],
  },
  'combat.creep.human_knight.escape': {
    seed: 763,
    layers: [
      trumpet(0, 0.16, 293.66, 0.5),
      trumpet(0.18, 0.3, 440, 0.55),
      ...hoof(0, 0.35),
      ...hoof(0.1, 0.3),
    ],
  },
  'combat.creep.human_knight.spawn': {
    seed: 764,
    layers: [
      ...hoof(0, 0.6, 1000),
      ...hoof(0.08, 0.5, 1000),
      ...hoof(0.2, 0.6, 1000),
      ...hoof(0.28, 0.5, 1000),
      plate(480, 0.38, 0.15, 0.3),
    ],
  },

  // Sorceress: glassy chimes, arcane whoosh, a shimmer on death.
  'combat.creep.human_sorceress.hit': {
    seed: 771,
    layers: [glass(2637, 0, 0.08, 0.35), thump(0, 300, 180, 0.05, 0.4)],
  },
  'combat.creep.human_sorceress.death': {
    seed: 772,
    layers: [
      glass(1760, 0, 0.5, 0.3),
      glass(1318.51, 0.08, 0.45, 0.25),
      glass(1046.5, 0.16, 0.4, 0.25),
      {
        waveform: 'sine',
        durationSec: 0.5,
        frequencyHz: 1760,
        frequencyEndHz: 440,
        vibrato: { rateHz: 9, depth: 0.03 },
        envelope: shaped(0.02, 0.3, 0.2, 0.15),
        gain: 0.2,
      },
      whoosh(0, 0.4, 4000, 1200, 0.2),
    ],
  },
  'combat.creep.human_sorceress.escape': {
    seed: 773,
    layers: [
      whoosh(0, 0.35, 1200, 5500, 0.45),
      {
        waveform: 'sine',
        durationSec: 0.35,
        frequencyHz: 660,
        frequencyEndHz: 1760,
        vibrato: { rateHz: 12, depth: 0.02 },
        envelope: shaped(0.05, 0.2, 0.4, 0.08),
        gain: 0.3,
      },
    ],
  },
  'combat.creep.human_sorceress.spawn': {
    seed: 774,
    layers: [
      whoosh(0, 0.25, 3000, 800, 0.4),
      glass(1174.66, 0.18, 0.3, 0.3),
      glass(1760, 0.2, 0.28, 0.2),
    ],
  },

  // Gryphon rider: wingbeats and a hawk-like screech.
  'combat.creep.human_gryphon_rider.hit': {
    seed: 781,
    layers: [
      ...wingbeat(0, 0.5),
      { ...screech(0.02, 0.05, 1800, 1400, 0.12), envelope: hit(0.045) },
    ],
  },
  'combat.creep.human_gryphon_rider.death': {
    seed: 782,
    layers: [
      screech(0, 0.4, 3000, 1400, 0.55),
      ...wingbeat(0.05, 0.35),
      ...wingbeat(0.2, 0.25),
      thump(0.42, 120, 50, 0.14, 0.6),
    ],
  },
  'combat.creep.human_gryphon_rider.escape': {
    seed: 783,
    layers: [
      screech(0, 0.15, 1600, 2600, 0.5),
      screech(0.17, 0.2, 2400, 1800, 0.45),
      ...wingbeat(0, 0.35),
      ...wingbeat(0.14, 0.3),
    ],
  },
  'combat.creep.human_gryphon_rider.spawn': {
    seed: 784,
    layers: [
      ...wingbeat(0, 0.5),
      ...wingbeat(0.13, 0.5),
      ...wingbeat(0.26, 0.45),
      screech(0.3, 0.2, 2200, 2800, 0.6),
    ],
  },
};
