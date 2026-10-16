import { Difficulty } from '../../../difficulty/model/types';

/**
 * How carefully the computer weighs a creature's two talent branches
 * (docs/07 "AI creature development"):
 * - `none`: never spends creature experience;
 * - `coarse`: reads only each grade's health, speed and armors;
 * - `full`: values the grade's abilities too, against the defender's towers.
 */
export const CreatureValuation = {
  NONE: 'none',
  COARSE: 'coarse',
  FULL: 'full',
} as const;

export type CreatureValuation = (typeof CreatureValuation)[keyof typeof CreatureValuation];

export const CREATURE_VALUATION_BY_DIFFICULTY: Readonly<Record<Difficulty, CreatureValuation>> = {
  [Difficulty.EASY]: CreatureValuation.NONE,
  [Difficulty.NORMAL]: CreatureValuation.COARSE,
  [Difficulty.HARD]: CreatureValuation.FULL,
  [Difficulty.NIGHTMARE]: CreatureValuation.FULL,
};

/** Tuning of the creature value model; every number is an expectation, never a roll. */
export const CREATURE_VALUATION = {
  /** Route cells a creature is assumed to walk under fire on the defender's field. */
  EXPOSURE_ROUTE_CELLS: 40,
  /** Share of the sends the model expects to leak (leak gold, lives, kill penalty). */
  EXPECTED_LEAK_SHARE: 0.25,
  /** Refills a recharging shield gets per recharge period of exposure (fire rarely pauses). */
  SHIELD_REFILLS_PER_RECHARGE_PERIOD: 0.25,
  /** Regeneration is worth this share while poison can pause it. */
  POISON_PAUSED_REGEN_SHARE: 0.5,
  /** Extra damage an armor break adds when every tower applies it. */
  ARMOR_BREAK_DAMAGE_SHARE: 0.15,
  /** Uptime of a chill or stun on a creature inside the towers that apply it. */
  CONTROL_UPTIME: 0.5,
  /** A stun is a full stop while it lasts. */
  STUN_SLOW: 1,
  /** Mean slow is capped below a full stop so the time factor stays finite. */
  MAX_MEAN_SLOW: 0.85,
  /** Economy gold never makes a send cheaper than this share of its price. */
  MIN_EFFECTIVE_COST_SHARE: 0.25,
} as const;
