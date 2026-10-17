import {
  canChooseCreatureBranch,
  canUpgradeCreature,
  getCreatureBranchCost,
  getCreatureXp,
  getNextCreatureGradeCost,
  type CreatureBranchChoices,
  type CreatureBranchRejectionReason,
  type CreatureGrade,
  type CreatureGrades,
  type CreatureUpgradeRejectionReason,
  type CreatureXpByTier,
  type UnitConfig,
} from '../../../entities/unit';
import { CreatureTalentRule } from '../../../shared/constants/creatureTalents';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { pluralizeUnitName } from '../../../shared/lib/text';
import { toBranchGlyph } from '../../../shared/ui/branch-glyph';
import { mapCreatureTalentGradeRows, type CreatureGradeRow } from './mapCreatureTalentGradeRows';

export type CreatureBranchCardViewModel = {
  id: string;
  name: string;
  description: string;
  glyph: string;
  rows: CreatureGradeRow[];
};

export type CreatureChosenBranchViewModel = {
  id: string;
  name: string;
  glyph: string;
};

/** No branch yet: Develop opens the chooser. */
export type CreatureDevelopActionViewModel = {
  kind: 'develop';
  cost: number;
  isAffordable: boolean;
  /** Why the branch cannot be paid for now; `null` when it can. */
  blockedReason: string | null;
  branches: CreatureBranchCardViewModel[];
};

/** A branch is chosen: Upgrade buys the next grade, until grade 4. */
export type CreatureUpgradeActionViewModel = {
  kind: 'upgrade';
  /** `null` at the top grade. */
  cost: number | null;
  nextGrade: number | null;
  isAffordable: boolean;
  blockedReason: string | null;
};

export type CreatureTalentViewModel = {
  /** Unspent experience of the creature's tier (shared by every creature of the tier). */
  xp: number;
  grade: number;
  maxGrade: number;
  chosenBranch: CreatureChosenBranchViewModel | null;
  /** "G2/4" once a branch is chosen; `null` before. */
  gradeBadge: string | null;
  /** Experience toward the next purchase, 0-1; 1 at the top grade. */
  xpProgress: number;
  /** "8/12 XP" toward the next purchase, "8 XP" at the top grade. */
  xpSummary: string;
  /** "Skeleton I G2/4" for labels and tooltips; `null` before a branch. */
  branchSummary: string | null;
  action: CreatureDevelopActionViewModel | CreatureUpgradeActionViewModel;
};

export type CreatureTalentSnapshot = Pick<
  GameHudSnapshot,
  'creatureXpByTier' | 'creatureBranchChoices' | 'creatureGrades'
>;

type CreatureTalentUnit = Pick<
  UnitConfig,
  | 'id'
  | 'tier'
  | 'health'
  | 'speed'
  | 'physicalArmor'
  | 'magicalArmor'
  | 'abilities'
  | 'talentBranches'
>;

const BRANCH_REASON_TEXT: Record<CreatureBranchRejectionReason, (cost: number) => string> = {
  not_enough_xp: (cost) => `Needs ${cost} XP`,
  already_chosen: () => 'Branch already chosen',
  unknown_branch: () => 'No branches',
};

const UPGRADE_REASON_TEXT: Record<CreatureUpgradeRejectionReason, (cost: number) => string> = {
  not_enough_xp: (cost) => `Needs ${cost} XP`,
  max_grade: () => 'Max grade',
  no_branch: () => 'Choose a branch first',
};

function toCreatureGrade(value: number | undefined): CreatureGrade {
  const whole = Math.trunc(value ?? 0);
  return Math.min(Math.max(whole, 0), CreatureTalentRule.MAX_GRADE) as CreatureGrade;
}

function toLedger(snapshot: CreatureTalentSnapshot, unit: CreatureTalentUnit) {
  const xpByTier: CreatureXpByTier = {
    [unit.tier]: snapshot.creatureXpByTier[unit.tier] ?? 0,
  };
  const chosenId = snapshot.creatureBranchChoices[unit.id];
  const choices: CreatureBranchChoices = chosenId === undefined ? {} : { [unit.id]: chosenId };
  const grades: CreatureGrades = { [unit.id]: toCreatureGrade(snapshot.creatureGrades[unit.id]) };
  return { xpByTier, choices, grades };
}

function summarizeXp(xp: number, targetCost: number | null): { summary: string; progress: number } {
  if (targetCost === null) {
    return { summary: `${xp} XP`, progress: 1 };
  }
  return {
    summary: `${xp}/${targetCost} XP`,
    progress: targetCost <= 0 ? 1 : Math.min(xp / targetCost, 1),
  };
}

function mapDevelopAction(
  unit: CreatureTalentUnit,
  choices: CreatureBranchChoices,
  xpByTier: CreatureXpByTier,
): CreatureDevelopActionViewModel {
  const cost = getCreatureBranchCost(unit.tier);
  const firstBranch = unit.talentBranches[0];
  const check = canChooseCreatureBranch(unit, firstBranch?.id ?? '', choices, xpByTier);
  return {
    kind: 'develop',
    cost,
    isAffordable: check.allowed,
    blockedReason: check.allowed ? null : BRANCH_REASON_TEXT[check.reason](cost),
    branches: unit.talentBranches.map((branch, index) => ({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      glyph: toBranchGlyph(index),
      rows: mapCreatureTalentGradeRows(unit, branch),
    })),
  };
}

function mapUpgradeAction(
  unit: CreatureTalentUnit,
  grade: CreatureGrade,
  ledger: ReturnType<typeof toLedger>,
): CreatureUpgradeActionViewModel {
  const cost = getNextCreatureGradeCost(unit.tier, grade);
  const check = canUpgradeCreature(unit, ledger.choices, ledger.grades, ledger.xpByTier);
  return {
    kind: 'upgrade',
    cost,
    nextGrade: cost === null ? null : grade + 1,
    isAffordable: check.allowed,
    blockedReason: check.allowed ? null : UPGRADE_REASON_TEXT[check.reason](cost ?? 0),
  };
}

/** Experience, branch, grade and the next talent action of one sendable creature. */
export function mapCreatureTalentState(
  unit: CreatureTalentUnit,
  snapshot: CreatureTalentSnapshot,
): CreatureTalentViewModel {
  const ledger = toLedger(snapshot, unit);
  const xp = getCreatureXp(ledger.xpByTier, unit.tier);
  const grade = ledger.grades[unit.id] ?? 0;
  const chosenIndex = unit.talentBranches.findIndex(
    (branch) => branch.id === ledger.choices[unit.id],
  );

  if (chosenIndex < 0) {
    const action = mapDevelopAction(unit, ledger.choices, ledger.xpByTier);
    const { summary, progress } = summarizeXp(xp, action.cost);
    return {
      xp,
      grade: 0,
      maxGrade: CreatureTalentRule.MAX_GRADE,
      chosenBranch: null,
      gradeBadge: null,
      xpProgress: progress,
      xpSummary: summary,
      branchSummary: null,
      action,
    };
  }

  const branch = unit.talentBranches[chosenIndex];
  const gradeBadge = `G${grade}/${CreatureTalentRule.MAX_GRADE}`;
  const action = mapUpgradeAction(unit, grade, ledger);
  const { summary, progress } = summarizeXp(xp, action.cost);
  return {
    xp,
    grade,
    maxGrade: CreatureTalentRule.MAX_GRADE,
    chosenBranch: { id: branch.id, name: branch.name, glyph: toBranchGlyph(chosenIndex) },
    gradeBadge,
    xpProgress: progress,
    xpSummary: summary,
    branchSummary: `${branch.name} ${gradeBadge}`,
    action,
  };
}

/** The chooser's confirmation line: the pick holds for every creature of the type. */
export function formatCreatureBranchLockWarning(creatureName: string): string {
  return `Locks the other branch for all ${pluralizeUnitName(creatureName)} this match`;
}
