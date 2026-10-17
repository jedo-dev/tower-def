import { bandpass, burst, hit, lowpass, thump } from './recipeKit';
import {
  bark,
  breath,
  cackle,
  clank,
  drum,
  footfall,
  gurgle,
  howl,
  whistle,
  woodSnap,
  yelp,
  type OrcCreatureRecipes,
} from './orcRecipeKit';

/** Light tool clanks and a thin yelp: the peon is the smallest orc voice. */
const PEON: OrcCreatureRecipes<'orc_peon'> = {
  'combat.creep.orc_peon.hit': {
    seed: 631,
    layers: [
      clank(0, 860, 0.07, 0.3),
      thump(0, 170, 95, 0.06, 0.55),
      yelp(0.008, 0.06, 560, 470, 0.3),
    ],
  },
  'combat.creep.orc_peon.death': {
    seed: 632,
    layers: [
      { ...yelp(0, 0.3, 640, 280, 0.55), vibrato: { rateHz: 9, depth: 0.05 } },
      clank(0.27, 900, 0.12, 0.3),
      clank(0.33, 760, 0.12, 0.22),
      thump(0.3, 150, 75, 0.1, 0.45),
    ],
  },
  'combat.creep.orc_peon.escape': {
    seed: 633,
    layers: [
      yelp(0, 0.1, 400, 470, 0.5),
      yelp(0.13, 0.13, 430, 560, 0.55),
      clank(0.05, 980, 0.08, 0.25),
      clank(0.2, 1040, 0.08, 0.2),
    ],
  },
  'combat.creep.orc_peon.spawn': {
    seed: 634,
    layers: [
      clank(0, 920, 0.09, 0.3),
      clank(0.1, 820, 0.09, 0.25),
      yelp(0.06, 0.16, 340, 480, 0.5),
      ...footfall(0.02, 0.35, 160),
    ],
  },
};

/** Paws in a gallop, a snarl and a wolf howl. */
const WOLF_RIDER: OrcCreatureRecipes<'orc_wolf_rider'> = {
  'combat.creep.orc_wolf_rider.hit': {
    seed: 641,
    layers: [
      {
        waveform: 'noise',
        durationSec: 0.08,
        frequencyHz: 3200,
        tremolo: { rateHz: 42, depth: 0.8 },
        envelope: hit(0.075),
        gain: 0.55,
        filters: [bandpass(850, undefined, 1.8)],
      },
      thump(0, 140, 72, 0.07, 0.6),
    ],
  },
  'combat.creep.orc_wolf_rider.death': {
    seed: 642,
    layers: [
      { ...howl(0, 0.38, 1300, 600, 0.8), envelope: hit(0.36, 0.01) },
      ...footfall(0.02, 0.25),
      ...footfall(0.1, 0.2),
      thump(0.36, 110, 52, 0.14, 0.4),
      burst(0.36, 0.06, 0.25, [lowpass(500)]),
    ],
  },
  'combat.creep.orc_wolf_rider.escape': {
    seed: 643,
    layers: [
      ...[0, 0.06, 0.12, 0.22, 0.28, 0.34].flatMap((startSec) => footfall(startSec, 0.45)),
      howl(0.3, 0.26, 560, 760, 0.45),
    ],
  },
  'combat.creep.orc_wolf_rider.spawn': {
    seed: 644,
    layers: [
      howl(0, 0.42, 470, 720, 0.6),
      ...[0.18, 0.24, 0.3, 0.4, 0.46].flatMap((startSec) => footfall(startSec, 0.35)),
    ],
  },
};

/** Rubbery thumps, a cackle and the wet gurgle of its regeneration. */
const TROLL: OrcCreatureRecipes<'orc_troll'> = {
  'combat.creep.orc_troll.hit': {
    seed: 651,
    layers: [
      { ...thump(0, 340, 120, 0.09, 0.8), vibrato: { rateHz: 34, depth: 0.15 } },
      burst(0, 0.03, 0.25, [lowpass(450)]),
    ],
  },
  'combat.creep.orc_troll.death': {
    seed: 652,
    layers: [
      cackle(0, 0.24, 540, 380, 0.6),
      gurgle(0.18, 0.32, 230, 100, 0.6),
      { ...thump(0.4, 180, 60, 0.14, 0.6), vibrato: { rateHz: 26, depth: 0.1 } },
    ],
  },
  'combat.creep.orc_troll.escape': {
    seed: 653,
    layers: [cackle(0, 0.36, 430, 580, 0.55), gurgle(0, 0.2, 160, 200, 0.3)],
  },
  'combat.creep.orc_troll.spawn': {
    seed: 654,
    layers: [
      gurgle(0, 0.34, 170, 320, 0.55),
      { ...thump(0.04, 210, 80, 0.1, 0.6), vibrato: { rateHz: 30, depth: 0.12 } },
      { ...thump(0.2, 200, 75, 0.1, 0.55), vibrato: { rateHz: 30, depth: 0.12 } },
      cackle(0.28, 0.18, 500, 560, 0.5),
    ],
  },
};

/** A whistling spear and a sharp yip. */
const HEADHUNTER: OrcCreatureRecipes<'orc_headhunter'> = {
  'combat.creep.orc_headhunter.hit': {
    seed: 661,
    layers: [
      { ...yelp(0, 0.05, 980, 780, 0.5, 1900), envelope: hit(0.045, 0.003) },
      thump(0, 150, 80, 0.06, 0.5),
    ],
  },
  'combat.creep.orc_headhunter.death': {
    seed: 662,
    layers: [
      { ...yelp(0, 0.28, 1100, 420, 0.6, 2000), vibrato: { rateHz: 11, depth: 0.04 } },
      breath(0.05, 0.22, 0.15),
      woodSnap(0.3, 0.45),
      woodSnap(0.36, 0.3),
      thump(0.3, 130, 60, 0.12, 0.5),
    ],
  },
  'combat.creep.orc_headhunter.escape': {
    seed: 663,
    layers: [
      whistle(0, 0.22, 2800, 1500, 0.7),
      { ...yelp(0.22, 0.07, 900, 1050, 0.5, 1900), envelope: hit(0.065, 0.003) },
      { ...yelp(0.32, 0.08, 950, 1150, 0.55, 1900), envelope: hit(0.075, 0.003) },
    ],
  },
  'combat.creep.orc_headhunter.spawn': {
    seed: 664,
    layers: [
      whistle(0, 0.2, 1400, 2900, 0.6),
      { ...yelp(0.18, 0.09, 820, 1100, 0.5, 1900), envelope: hit(0.085, 0.003) },
      ...drum(0.2, 0.5),
      bark(0.28, 0.12, 220, 260, 0.25),
    ],
  },
};

export const ORC_EARLY_CREATURE_RECIPES = {
  ...PEON,
  ...WOLF_RIDER,
  ...TROLL,
  ...HEADHUNTER,
};
