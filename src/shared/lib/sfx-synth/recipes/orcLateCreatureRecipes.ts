import { burst, hit, lowpass, thump } from './recipeKit';
import { ORC_TAUREN_RECIPES } from './orcTrollTaurenRecipes';
import {
  chant,
  drum,
  rattle,
  screech,
  spark,
  wingbeat,
  type OrcCreatureRecipes,
} from './orcRecipeKit';

/** Gourd rattle, a low chant and crackling sparks. */
const SHAMAN: OrcCreatureRecipes<'orc_shaman'> = {
  'combat.creep.orc_shaman.hit': {
    seed: 671,
    layers: [rattle(0, 0.08, 0.5, 34), spark(0.01, 0.06, 0.35), thump(0, 160, 85, 0.06, 0.35)],
  },
  'combat.creep.orc_shaman.death': {
    seed: 672,
    layers: [
      ...chant(0, 0.48, 150, 92, 0.4),
      rattle(0.05, 0.3, 0.3, 18),
      spark(0.3, 0.2, 0.22),
      thump(0.4, 110, 50, 0.14, 0.5),
    ],
  },
  'combat.creep.orc_shaman.escape': {
    seed: 673,
    layers: [
      ...chant(0, 0.2, 140, 140, 0.4),
      ...chant(0.2, 0.26, 165, 165, 0.42),
      rattle(0, 0.44, 0.3, 22),
    ],
  },
  'combat.creep.orc_shaman.spawn': {
    seed: 674,
    layers: [
      spark(0, 0.14, 0.5),
      ...chant(0.08, 0.4, 120, 150, 0.4),
      rattle(0.12, 0.34, 0.3, 26),
      ...drum(0.08, 0.35),
    ],
  },
};

/** Wyvern screech over heavy wingbeats. */
const WIND_RIDER: OrcCreatureRecipes<'orc_wind_rider'> = {
  'combat.creep.orc_wind_rider.hit': {
    seed: 681,
    layers: [
      { ...screech(0, 0.06, 1350, 1100, 0.4), envelope: hit(0.055, 0.004) },
      wingbeat(0, 0.08, 0.55),
      thump(0, 130, 75, 0.06, 0.4),
    ],
  },
  'combat.creep.orc_wind_rider.death': {
    seed: 682,
    layers: [
      screech(0, 0.36, 1450, 650, 0.6),
      wingbeat(0.02, 0.14, 0.5),
      wingbeat(0.2, 0.18, 0.45),
      thump(0.42, 100, 45, 0.15, 0.6),
      burst(0.42, 0.06, 0.25, [lowpass(450)]),
    ],
  },
  'combat.creep.orc_wind_rider.escape': {
    seed: 683,
    layers: [
      wingbeat(0, 0.16, 0.55),
      wingbeat(0.15, 0.13, 0.55),
      wingbeat(0.27, 0.11, 0.55),
      screech(0.3, 0.22, 950, 1300, 0.45),
    ],
  },
  'combat.creep.orc_wind_rider.spawn': {
    seed: 684,
    layers: [
      screech(0, 0.3, 800, 1350, 0.5),
      wingbeat(0.18, 0.16, 0.55),
      wingbeat(0.34, 0.16, 0.5),
    ],
  },
};

export const ORC_LATE_CREATURE_RECIPES = {
  ...SHAMAN,
  ...WIND_RIDER,
  ...ORC_TAUREN_RECIPES,
};
