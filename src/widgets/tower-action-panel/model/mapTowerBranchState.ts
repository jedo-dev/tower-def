import {
  canChooseBranch,
  getTowerStatsForCurveLevel,
  getTowerTalentBranches,
  resolveTowerUpgradeConfig,
  toTowerUpgradeCurveRef,
  type BranchChoiceRejectionReason,
  type TowerBranchChoices,
} from '../../../entities/tower';
import { TowerTalentPricing, TowerTalentRule } from '../../../shared/constants/towerTalents';
import type { SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { toBranchGlyph } from '../../../shared/ui/branch-glyph';
import { mapTalentBranchGradeRows, type TalentGradeRow } from './mapTalentBranchGradeRows';

export type TalentBranchCardViewModel = {
  id: string;
  name: string;
  description: string;
  glyph: string;
  rows: TalentGradeRow[];
};

export type TowerChosenBranchViewModel = {
  id: string;
  name: string;
  glyph: string;
};

/** The "Develop" action of a grade-3 tower whose type has no branch yet. */
export type TowerDevelopViewModel = {
  cost: number;
  isAffordable: boolean;
  /** Why Develop cannot be paid for now; `null` when it can. */
  blockedReason: string | null;
  branches: TalentBranchCardViewModel[];
};

export type TowerBranchPanelState = {
  /** Top grade shown in the level badge: 7 for a tower with branches, else its curve's cap. */
  maxGrade: number;
  chosenBranch: TowerChosenBranchViewModel | null;
  develop: TowerDevelopViewModel | null;
};

const BLOCKED_REASON_TEXT: Record<BranchChoiceRejectionReason, string> = {
  not_enough_gold: 'Not enough gold',
  not_grade_3: `Reach level ${TowerTalentRule.BRANCH_UNLOCK_GRADE} first`,
  already_chosen: 'Branch already chosen',
  unknown_branch: 'No branches for this tower',
};

/** The chooser's confirmation line: a pick holds for every tower of the type. */
export function formatBranchLockWarning(towerName: string): string {
  return `Locks the other branch for all ${towerName} this match`;
}

type BranchStateTower = Pick<
  SelectedTowerSnapshot,
  'type' | 'buildableTowerId' | 'level' | 'chosenBranchId'
>;

export function mapTowerBranchState(
  tower: BranchStateTower,
  gold: number,
  choices: TowerBranchChoices,
): TowerBranchPanelState {
  const curve = toTowerUpgradeCurveRef(tower.type, tower.buildableTowerId);
  const branches = getTowerTalentBranches(curve.buildableTowerId);

  if (branches.length === 0) {
    return {
      maxGrade: resolveTowerUpgradeConfig(curve, choices).maxLevel,
      chosenBranch: null,
      develop: null,
    };
  }

  const chosenIndex = branches.findIndex((branch) => branch.id === tower.chosenBranchId);
  const chosenBranch =
    chosenIndex < 0
      ? null
      : {
          id: branches[chosenIndex].id,
          name: branches[chosenIndex].name,
          glyph: toBranchGlyph(chosenIndex),
        };

  const gradeThreeStats = getTowerStatsForCurveLevel(
    tower.type,
    tower.buildableTowerId,
    TowerTalentRule.BRANCH_UNLOCK_GRADE,
  );
  const canDevelop =
    chosenBranch === null &&
    tower.level === TowerTalentRule.BRANCH_UNLOCK_GRADE &&
    gradeThreeStats !== null;

  if (!canDevelop) {
    return { maxGrade: TowerTalentRule.MAX_BRANCH_GRADE, chosenBranch, develop: null };
  }

  const check = canChooseBranch(
    { type: tower.type, buildableTowerId: curve.buildableTowerId, level: tower.level },
    branches[0].id,
    choices,
    gold,
  );

  return {
    maxGrade: TowerTalentRule.MAX_BRANCH_GRADE,
    chosenBranch,
    develop: {
      cost: TowerTalentPricing.BRANCH_COST,
      isAffordable: check.allowed,
      blockedReason: check.allowed ? null : BLOCKED_REASON_TEXT[check.reason],
      branches: branches.map((branch, index) => ({
        id: branch.id,
        name: branch.name,
        description: branch.description,
        glyph: toBranchGlyph(index),
        rows: mapTalentBranchGradeRows(tower.type, gradeThreeStats, branch),
      })),
    },
  };
}
