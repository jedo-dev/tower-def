/**
 * Tower talents (docs/11-tower-talents-ru.md, "Общие правила"): at grade 3 a
 * race tower opens two branches; choosing one for a tower type locks the other
 * for the rest of the match and unlocks grades 4-7 for every tower of the type.
 */
export enum TowerTalentRule {
  /** The grade a tower must reach before its branch can be chosen; base curves end here. */
  BRANCH_UNLOCK_GRADE = 3,
  /** Highest grade once a branch is chosen. */
  MAX_BRANCH_GRADE = 7,
  /** Every race tower authors exactly this many branches. */
  BRANCH_COUNT = 2,
}

/** Grades a branch authors, in order. */
export const TOWER_TALENT_GRADE_LEVELS = [4, 5, 6, 7] as const;

export type TowerTalentGradeLevel = (typeof TOWER_TALENT_GRADE_LEVELS)[number];

/**
 * One price ladder for every tower of every race. Content never prices a grade:
 * the loader fills each grade's upgrade cost from here, so a balance pass tunes
 * one table instead of 32 branches.
 */
export const TowerTalentPricing = {
  /** Paid once per tower type per match, when its branch is chosen. */
  BRANCH_COST: 120,
  GRADE_COSTS: { 4: 150, 5: 200, 6: 260, 7: 340 },
} as const satisfies {
  BRANCH_COST: number;
  GRADE_COSTS: Readonly<Record<TowerTalentGradeLevel, number>>;
};
