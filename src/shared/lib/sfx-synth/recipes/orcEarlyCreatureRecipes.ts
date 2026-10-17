import { hit, thump } from './recipeKit';
import {
  bark,
  breath,
  drum,
  woodSnap,
  whistle,
  yelp,
  type OrcCreatureRecipes,
} from './orcRecipeKit';
import { ORC_PEON_WOLF_RECIPES } from './orcPeonWolfRecipes';
import { ORC_TROLL_RECIPES } from './orcTrollTaurenRecipes';

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
  ...ORC_PEON_WOLF_RECIPES,
  ...ORC_TROLL_RECIPES,
  ...HEADHUNTER,
};
