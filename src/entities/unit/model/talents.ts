import {
  CreatureTalentPricing,
  CreatureTalentRule,
  CreatureXpRewards,
  type CreatureTalentGradeLevel,
} from '../../../shared/constants/creatureTalents';
import type {
  CreatureGradeStats,
  CreatureTalentBranchDefinition,
} from './content/creatureTalentContent';
import type { UnitConfig, UnitId, UnitTier } from './types';

/**
 * Creature talent rules (docs/12-unit-talents-ru.md, "Общие правила"). A side
 * earns experience per tier from its sends, spends it to pick one branch per
 * creature for the whole match, then to climb that branch through grades 1-4.
 * Pure functions over immutable records, so the engine, the computer and the
 * simulators share the same rules.
 */

export type CreatureTalentBranchId = string;

/** Grade along the chosen branch; 0 is the authored base creature. */
export type CreatureGrade = 0 | CreatureTalentGradeLevel;

/** A side's unspent experience per tier; absent means 0. */
export type CreatureXpByTier = Readonly<Partial<Record<UnitTier, number>>>;

/** A side's branch picks per creature; absent means no branch chosen yet. */
export type CreatureBranchChoices = Readonly<Partial<Record<UnitId, CreatureTalentBranchId>>>;

/** A side's bought grades per creature; absent means grade 0. */
export type CreatureGrades = Readonly<Partial<Record<UnitId, CreatureGrade>>>;

/** Everything a side owns of the creature talent system, kept for the whole match. */
export type CreatureTalentLedger = {
  creatureXpByTier: CreatureXpByTier;
  creatureBranchChoices: CreatureBranchChoices;
  creatureGrades: CreatureGrades;
};

export const NO_CREATURE_XP: CreatureXpByTier = Object.freeze({});
export const NO_CREATURE_BRANCH_CHOICES: CreatureBranchChoices = Object.freeze({});
export const NO_CREATURE_GRADES: CreatureGrades = Object.freeze({});

/** What the rules read from a creature: its id, tier and authored branches. */
export type CreatureTalentRef = Pick<UnitConfig, 'id' | 'tier' | 'talentBranches'>;

export type CreatureBranchRejectionReason = 'unknown_branch' | 'already_chosen' | 'not_enough_xp';

export type CreatureUpgradeRejectionReason = 'no_branch' | 'max_grade' | 'not_enough_xp';

export type CreatureTalentCheck<Reason extends string> =
  | { allowed: true; cost: number }
  | { allowed: false; reason: Reason };

export type CreatureTalentResult<Reason extends string> = {
  ledger: CreatureTalentLedger;
  check: CreatureTalentCheck<Reason>;
};

export function getCreatureXp(xpByTier: CreatureXpByTier, tier: UnitTier): number {
  return xpByTier[tier] ?? 0;
}

/** Adds (or, negative, spends) experience of one tier. */
export function addCreatureXp(
  xpByTier: CreatureXpByTier,
  tier: UnitTier,
  amount: number,
): CreatureXpByTier {
  return amount === 0 ? xpByTier : { ...xpByTier, [tier]: getCreatureXp(xpByTier, tier) + amount };
}

/** Experience a tier earns when one of its sent creatures dies on the other field. */
export function getCreatureDeathXp(tier: UnitTier): number {
  return CreatureXpRewards.DEATH_PER_TIER * tier;
}

/** Experience a tier earns when one of its sent creatures leaks, more if it took a life. */
export function getCreatureLeakXp(tier: UnitTier, tookLife: boolean): number {
  return (
    CreatureXpRewards.LEAK_PER_TIER * tier + (tookLife ? CreatureXpRewards.LEAK_TOOK_LIFE_BONUS : 0)
  );
}

export function getCreatureBranchCost(tier: UnitTier): number {
  return CreatureTalentPricing.BRANCH_COST_PER_TIER * tier;
}

/** Experience the next grade costs, or null at the top grade. */
export function getNextCreatureGradeCost(tier: UnitTier, grade: CreatureGrade): number | null {
  if (grade >= CreatureTalentRule.MAX_GRADE) {
    return null;
  }
  const nextGrade = (grade + 1) as CreatureTalentGradeLevel;
  return CreatureTalentPricing.GRADE_COSTS_PER_TIER[nextGrade] * tier;
}

export function getCreatureGrade(unitId: UnitId, grades: CreatureGrades): CreatureGrade {
  return grades[unitId] ?? 0;
}

export function getChosenCreatureBranchId(
  unitId: UnitId,
  choices: CreatureBranchChoices,
): CreatureTalentBranchId | null {
  return choices[unitId] ?? null;
}

/** The branch a creature follows, or undefined while none is chosen. */
export function resolveChosenCreatureBranch(
  unit: CreatureTalentRef,
  choices: CreatureBranchChoices,
): CreatureTalentBranchDefinition | undefined {
  const chosenId = getChosenCreatureBranchId(unit.id, choices);
  return chosenId === null
    ? undefined
    : unit.talentBranches.find((branch) => branch.id === chosenId);
}

/**
 * Whether `branchId` may be chosen for this creature now: it must be one of its
 * branches, the creature must have no branch yet and the creature's tier must
 * hold `BRANCH_COST_PER_TIER * tier` experience.
 */
export function canChooseCreatureBranch(
  unit: CreatureTalentRef,
  branchId: CreatureTalentBranchId,
  choices: CreatureBranchChoices,
  xpByTier: CreatureXpByTier,
): CreatureTalentCheck<CreatureBranchRejectionReason> {
  if (!unit.talentBranches.some((branch) => branch.id === branchId)) {
    return { allowed: false, reason: 'unknown_branch' };
  }
  if (getChosenCreatureBranchId(unit.id, choices) !== null) {
    return { allowed: false, reason: 'already_chosen' };
  }
  const cost = getCreatureBranchCost(unit.tier);
  if (getCreatureXp(xpByTier, unit.tier) < cost) {
    return { allowed: false, reason: 'not_enough_xp' };
  }
  return { allowed: true, cost };
}

/** Picks the branch and spends its experience when the check allows it; unchanged otherwise. */
export function chooseCreatureBranch(
  ledger: CreatureTalentLedger,
  unit: CreatureTalentRef,
  branchId: CreatureTalentBranchId,
): CreatureTalentResult<CreatureBranchRejectionReason> {
  const check = canChooseCreatureBranch(
    unit,
    branchId,
    ledger.creatureBranchChoices,
    ledger.creatureXpByTier,
  );
  if (!check.allowed) {
    return { ledger, check };
  }
  return {
    ledger: {
      ...ledger,
      creatureXpByTier: addCreatureXp(ledger.creatureXpByTier, unit.tier, -check.cost),
      creatureBranchChoices: { ...ledger.creatureBranchChoices, [unit.id]: branchId },
    },
    check,
  };
}

/** Whether the creature may climb one grade along its chosen branch now. */
export function canUpgradeCreature(
  unit: CreatureTalentRef,
  choices: CreatureBranchChoices,
  grades: CreatureGrades,
  xpByTier: CreatureXpByTier,
): CreatureTalentCheck<CreatureUpgradeRejectionReason> {
  if (resolveChosenCreatureBranch(unit, choices) === undefined) {
    return { allowed: false, reason: 'no_branch' };
  }
  const cost = getNextCreatureGradeCost(unit.tier, getCreatureGrade(unit.id, grades));
  if (cost === null) {
    return { allowed: false, reason: 'max_grade' };
  }
  if (getCreatureXp(xpByTier, unit.tier) < cost) {
    return { allowed: false, reason: 'not_enough_xp' };
  }
  return { allowed: true, cost };
}

/** Buys the next grade and spends its experience when the check allows it; unchanged otherwise. */
export function upgradeCreature(
  ledger: CreatureTalentLedger,
  unit: CreatureTalentRef,
): CreatureTalentResult<CreatureUpgradeRejectionReason> {
  const check = canUpgradeCreature(
    unit,
    ledger.creatureBranchChoices,
    ledger.creatureGrades,
    ledger.creatureXpByTier,
  );
  if (!check.allowed) {
    return { ledger, check };
  }
  const nextGrade = (getCreatureGrade(unit.id, ledger.creatureGrades) + 1) as CreatureGrade;
  return {
    ledger: {
      ...ledger,
      creatureXpByTier: addCreatureXp(ledger.creatureXpByTier, unit.tier, -check.cost),
      creatureGrades: { ...ledger.creatureGrades, [unit.id]: nextGrade },
    },
    check,
  };
}

/**
 * The stats a creature spawns with at `grade` along its chosen branch. Grade 0,
 * or a creature without a branch, is the authored base. Health is the wave 1
 * value: wave growth still applies on spawn.
 */
export function resolveCreatureStatsAtGrade(
  unit: CreatureTalentRef & CreatureGradeStats,
  choices: CreatureBranchChoices,
  grade: CreatureGrade,
): CreatureGradeStats {
  const gradeRow =
    grade === 0 ? undefined : resolveChosenCreatureBranch(unit, choices)?.grades[grade - 1];
  const source: CreatureGradeStats = gradeRow ?? unit;
  return {
    health: source.health,
    speed: source.speed,
    physicalArmor: source.physicalArmor,
    magicalArmor: source.magicalArmor,
    ...(source.abilities === undefined ? {} : { abilities: source.abilities }),
  };
}

/** `resolveCreatureStatsAtGrade` at the grade the side currently owns. */
export function resolveCreatureStatsForGrade(
  unit: CreatureTalentRef & CreatureGradeStats,
  choices: CreatureBranchChoices,
  grades: CreatureGrades,
): CreatureGradeStats {
  return resolveCreatureStatsAtGrade(unit, choices, getCreatureGrade(unit.id, grades));
}

/** The creature config a send spawns as: the authored creature with its grade's stats. */
export function applyCreatureGrade(
  unit: UnitConfig,
  choices: CreatureBranchChoices,
  grade: CreatureGrade,
): UnitConfig {
  if (grade === 0) {
    return unit;
  }
  const stats = resolveCreatureStatsAtGrade(unit, choices, grade);
  // A grade replaces the abilities like it replaces the stats: none declared, none carried.
  return { ...unit, ...stats, abilities: stats.abilities };
}
