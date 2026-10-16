/**
 * Creature talents (docs/12-unit-talents-ru.md, "Общие правила"): every
 * creature authors two branches. A side earns experience per tier from its
 * sends, spends it to pick one branch per creature for the whole match and
 * then to climb that branch through grades 1-4. A grade applies to the
 * creatures of that type sent after the purchase.
 */
export enum CreatureTalentRule {
  /** Every creature authors exactly this many branches. */
  BRANCH_COUNT = 2,
  /** Highest grade along a chosen branch; grade 0 is the authored base. */
  MAX_GRADE = 4,
}

/** Grades a branch authors, in order. */
export const CREATURE_TALENT_GRADE_LEVELS = [1, 2, 3, 4] as const;

export type CreatureTalentGradeLevel = (typeof CREATURE_TALENT_GRADE_LEVELS)[number];

/**
 * One experience ladder for every creature, scaled by its tier: a step costs
 * `cost * tier` experience of that tier. Content never prices a grade.
 */
export const CreatureTalentPricing = {
  /** Paid once per creature per match, when its branch is chosen. */
  BRANCH_COST_PER_TIER: 4,
  GRADE_COSTS_PER_TIER: { 1: 6, 2: 10, 3: 16, 4: 26 },
} as const satisfies {
  BRANCH_COST_PER_TIER: number;
  GRADE_COSTS_PER_TIER: Readonly<Record<CreatureTalentGradeLevel, number>>;
};

/**
 * Experience a tier earns from one sent creature, scaled by that tier. A leak
 * pays more than a death: the creature did its job. A leak that cost the
 * defender a life adds a flat bonus on top.
 */
export const CreatureXpRewards = {
  DEATH_PER_TIER: 1,
  LEAK_PER_TIER: 3,
  LEAK_TOOK_LIFE_BONUS: 2,
} as const satisfies Readonly<Record<string, number>>;
