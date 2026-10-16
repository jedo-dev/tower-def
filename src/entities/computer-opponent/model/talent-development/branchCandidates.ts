import { TowerTalentPricing, TowerTalentRule } from '../../../../shared/constants/towerTalents';
import {
  getChosenBranchId,
  getTowerTalentBranches,
  type TowerBranchChoices,
} from '../../../tower/model/talents';
import type { BuildableTowerId } from '../../../tower/model/towerIds';
import type { TowerEntity } from '../../../tower/model/types';
import type { BranchCandidate, UpgradeCandidate } from '../damage-placement/planRoundInvestments';
import type { RouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { computeBoardValuePerGold, hasEconomyGrades } from './boardValuePerGold';
import { selectBestBranch } from './branchValuation';
import { TalentValuation } from './constants';

export type BranchCandidateInput = {
  /** Towers in ledger order: `towers[i]` is `ledger.towers[i]`. */
  towers: readonly TowerEntity[];
  ledger: RouteDamageLedger;
  choices: TowerBranchChoices;
  valuation: TalentValuation;
};

/** Race tower types that stand at grade 3 with no branch picked yet, in field order. */
function collectUndevelopedTypes(
  towers: readonly TowerEntity[],
  choices: TowerBranchChoices,
): BuildableTowerId[] {
  const types: BuildableTowerId[] = [];
  for (const tower of towers) {
    const id = tower.buildableTowerId;
    if (
      id !== undefined &&
      tower.level === TowerTalentRule.BRANCH_UNLOCK_GRADE &&
      getChosenBranchId(id, choices) === null &&
      !types.includes(id)
    ) {
      types.push(id);
    }
  }
  return types;
}

/** The type's grade-3 tower the ledger values most: the one a branch is valued on. */
function findLeadIndex(
  towers: readonly TowerEntity[],
  ledger: RouteDamageLedger,
  buildableTowerId: BuildableTowerId,
): number {
  let leadIndex = -1;
  let leadValue = -Infinity;
  towers.forEach((tower, index) => {
    if (
      tower.buildableTowerId !== buildableTowerId ||
      tower.level !== TowerTalentRule.BRANCH_UNLOCK_GRADE
    ) {
      return;
    }
    const value = ledger.contributionOf(ledger.towers[index], index);
    if (value > leadValue) {
      leadValue = value;
      leadIndex = index;
    }
  });
  return leadIndex;
}

/**
 * One talent pick per tower type the opponent may develop now (a tower of
 * the type at grade 3, no branch chosen): the type's better branch by
 * `selectBestBranch` on its most valuable grade-3 tower, with the grade 4
 * steps the pick opens for every grade-3 tower of the type. None when the
 * difficulty does not develop (`TalentValuation.NONE`).
 */
export function collectBranchCandidates(input: BranchCandidateInput): BranchCandidate[] {
  const { towers, ledger, choices, valuation } = input;
  if (valuation === TalentValuation.NONE) {
    return [];
  }

  const candidates: BranchCandidate[] = [];
  let boardValuePerGold: number | null = null;
  for (const buildableTowerId of collectUndevelopedTypes(towers, choices)) {
    const leadIndex = findLeadIndex(towers, ledger, buildableTowerId);
    const branches = getTowerTalentBranches(buildableTowerId);
    const valuePerGold = branches.some((branch) => hasEconomyGrades(branch.grades))
      ? (boardValuePerGold ??= computeBoardValuePerGold(towers, ledger, choices))
      : 0;
    const best =
      leadIndex < 0
        ? null
        : selectBestBranch(
            ledger,
            leadIndex,
            branches,
            valuation,
            TowerTalentPricing.BRANCH_COST,
            valuePerGold,
          );
    const branch = branches.find((candidate) => candidate.id === best?.branchId);
    const firstGrade = branch?.grades[0];
    const topGrade = branch?.grades[branch.grades.length - 1];
    if (!best || !firstGrade || !topGrade || best.topGradeGain <= 0) {
      continue;
    }
    const path = { topStats: topGrade.stats, cost: best.pathCost - TowerTalentPricing.BRANCH_COST };

    const gradeUpgrades: UpgradeCandidate[] = [];
    towers.forEach((tower, ledgerIndex) => {
      if (
        tower.buildableTowerId === buildableTowerId &&
        tower.level === TowerTalentRule.BRANCH_UNLOCK_GRADE
      ) {
        gradeUpgrades.push({
          towerId: tower.id,
          ledgerIndex,
          cost: firstGrade.upgradeCostGold,
          nextStats: firstGrade.stats,
          path,
        });
      }
    });

    candidates.push({
      buildableTowerId,
      branchId: best.branchId,
      towerId: towers[leadIndex].id,
      cost: TowerTalentPricing.BRANCH_COST,
      value: best.topGradeGain,
      pathCost: best.pathCost,
      gradeUpgrades,
    });
  }
  return candidates;
}
