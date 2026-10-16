import type { TowerUpgradeLevel } from '../../../tower/model/upgradeConfig';
import type { RouteDamageLedger } from '../damage-placement/routeDamageLedger';
import type { DamageModelStats } from '../damage-placement/towerDamageModel';
import {
  TALENT_ECONOMY_PAYBACK_ROUNDS,
  TALENT_EXPECTED_AURA_KILLS_PER_ROUND,
  TalentValuation,
} from './constants';

/** A talent branch as the valuation reads it: its id and grades 4-7 in order. */
export type BranchPath = { id: string; grades: readonly TowerUpgradeLevel[] };

export type BranchValue = {
  branchId: string;
  /**
   * Route value the tower gains from grade 3 to the top grade (ledger units),
   * its economy's gold included at the board's value per gold.
   */
  topGradeGain: number;
  /** Mean value gain over grades 4-7, per gold of the path price. */
  score: number;
  /** Branch price plus every grade's price. */
  pathCost: number;
};

/**
 * A grade as the coarse valuation reads it: only the numbers of its table
 * (damage, range, reload, splash) on top of the tower's grade 3 mechanics, so
 * whatever the branch adds (abilities, effects, an aura change) goes unseen.
 */
function coarseStats(current: DamageModelStats, grade: DamageModelStats): DamageModelStats {
  return {
    ...current,
    damage: grade.damage,
    range: grade.range,
    attackCooldownMs: grade.attackCooldownMs,
    ...(grade.splashRadius === undefined ? {} : { splashRadius: grade.splashRadius }),
  };
}

/** Gold the grade's economy aura pays over the payback horizon. */
function economyGold(stats: TowerUpgradeLevel['stats']): number {
  const aura = stats.aura;
  if (!aura) {
    return 0;
  }
  const perRound =
    (aura.incomePerRound ?? 0) + (aura.goldPerKill ?? 0) * TALENT_EXPECTED_AURA_KILLS_PER_ROUND;
  return perRound * TALENT_ECONOMY_PAYBACK_ROUNDS;
}

/**
 * Route value each grade adds over the tower at grade 3 (`ledgerIndex` in the
 * ledger), on the ledger against the expected wave. Full: the grade's whole
 * stats, so extra targets, marks, slows and auras count. Coarse: only the
 * grade's numbers (`coarseStats`).
 */
function gradeGains(
  ledger: RouteDamageLedger,
  ledgerIndex: number,
  grades: readonly TowerUpgradeLevel[],
  valuation: TalentValuation,
): number[] {
  const current = ledger.towers[ledgerIndex];
  const base = ledger.contributionOf(current, ledgerIndex);
  return grades.map((grade) => {
    const stats =
      valuation === TalentValuation.FULL ? grade.stats : coarseStats(current.stats, grade.stats);
    return ledger.contributionOf({ ...current, stats }, ledgerIndex) - base;
  });
}

/**
 * What developing the tower at `ledgerIndex` along `branch` is worth: the
 * route value its grades add against the ledger's wave, plus the gold their
 * economy pays over `TALENT_ECONOMY_PAYBACK_ROUNDS` at `valuePerGold` (the
 * route value a gold buys on this board, see `computeBoardValuePerGold`), per
 * gold of the whole path (the branch price and every grade). Deterministic:
 * same ledger, same value.
 */
export function valueBranchPath(
  ledger: RouteDamageLedger,
  ledgerIndex: number,
  branch: BranchPath,
  valuation: TalentValuation,
  branchCost: number,
  valuePerGold = 0,
): BranchValue {
  const pathCost =
    branchCost + branch.grades.reduce((sum, grade) => sum + grade.upgradeCostGold, 0);
  if (valuation === TalentValuation.NONE) {
    return { branchId: branch.id, topGradeGain: 0, score: 0, pathCost };
  }
  const currentEconomy = economyGold(ledger.towers[ledgerIndex].stats);
  const gains = gradeGains(ledger, ledgerIndex, branch.grades, valuation).map(
    (gain, step) =>
      gain + Math.max(0, economyGold(branch.grades[step].stats) - currentEconomy) * valuePerGold,
  );
  const meanGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;

  return {
    branchId: branch.id,
    topGradeGain: gains.length > 0 ? gains[gains.length - 1] : 0,
    score: pathCost > 0 ? meanGain / pathCost : 0,
    pathCost,
  };
}

/**
 * The branch worth more per gold for the tower at `ledgerIndex` (economy
 * valued at `valuePerGold`); ties keep
 * the authored order. Null when no branch adds value (or valuation is none).
 */
export function selectBestBranch(
  ledger: RouteDamageLedger,
  ledgerIndex: number,
  branches: readonly BranchPath[],
  valuation: TalentValuation,
  branchCost: number,
  valuePerGold = 0,
): BranchValue | null {
  if (valuation === TalentValuation.NONE) {
    return null;
  }
  let best: BranchValue | null = null;
  for (const branch of branches) {
    const value = valueBranchPath(ledger, ledgerIndex, branch, valuation, branchCost, valuePerGold);
    if (value.score > 0 && (best === null || value.score > best.score)) {
      best = value;
    }
  }
  return best;
}
