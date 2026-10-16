import { Difficulty } from '../../../difficulty/model/types';

/**
 * How carefully the computer weighs the two talent branches of a tower type
 * (docs/07 "AI talent development"):
 * - `none`: never picks a branch, so the curve stops at grade 3;
 * - `coarse`: reads only the numbers of each grade (damage, range, reload,
 *   splash) on the route damage ledger, blind to the abilities, effects and
 *   aura changes a branch adds;
 * - `full`: values every grade on the route damage ledger, abilities included.
 */
export const TalentValuation = {
  NONE: 'none',
  COARSE: 'coarse',
  FULL: 'full',
} as const;

export type TalentValuation = (typeof TalentValuation)[keyof typeof TalentValuation];

export const TALENT_VALUATION_BY_DIFFICULTY: Readonly<Record<Difficulty, TalentValuation>> = {
  [Difficulty.EASY]: TalentValuation.NONE,
  [Difficulty.NORMAL]: TalentValuation.COARSE,
  [Difficulty.HARD]: TalentValuation.FULL,
  [Difficulty.NIGHTMARE]: TalentValuation.FULL,
};

/**
 * Economy talents (aura `incomePerRound`, `goldPerKill`) are valued by the
 * gold they pay over this many rounds, at the route value a gold buys on the
 * board (`computeBoardValuePerGold`).
 */
export const TALENT_ECONOMY_PAYBACK_ROUNDS = 5;

/** Kills a round the model credits to towers inside an economy aura. */
export const TALENT_EXPECTED_AURA_KILLS_PER_ROUND = 6;
