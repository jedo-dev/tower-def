import type { TowerUpgradeLevel } from '../../../tower/model/upgradeConfig';
import type { RouteDamageLedger } from '../damage-placement/routeDamageLedger';
import type { DamageModelStats } from '../damage-placement/towerDamageModel';
import {
  TALENT_ECONOMY_PAYBACK_ROUNDS,
  TALENT_EXPECTED_AURA_KILLS_PER_ROUND,
  TALENT_MIN_EFFECTIVE_COST_SHARE,
  TalentValuation,
} from './constants';

/** A talent branch as the valuation reads it: its id and grades 4-7 in order. */
export type BranchPath = { id: string; grades: readonly TowerUpgradeLevel[] };

export type BranchValue = {
  branchId: string;
  /** Route value the tower gains from grade 3 to the top grade (ledger units). */
  topGradeGain: number;
  /** Mean route value gain over grades 4-7, per gold of the effective path price. */
  score: number;
  /** Branch price plus every grade's price. */
  pathCost: number;
  /** `pathCost` less the gold the branch's economy pays back, floored. */
  effectiveCost: number;
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
 * route value its grades add against the ledger's wave, per gold of the whole
 * path (the branch price and every grade), economy paid back over
 * `TALENT_ECONOMY_PAYBACK_ROUNDS`. Deterministic: same ledger, same value.
 */
export function valueBranchPath(
  ledger: RouteDamageLedger,
  ledgerIndex: number,
  branch: BranchPath,
  valuation: TalentValuation,
  branchCost: number,
): BranchValue {
  const gains =
    valuation === TalentValuation.NONE
      ? []
      : gradeGains(ledger, ledgerIndex, branch.grades, valuation);
  const pathCost =
    branchCost + branch.grades.reduce((sum, grade) => sum + grade.upgradeCostGold, 0);
  const currentEconomy = economyGold(ledger.towers[ledgerIndex].stats);
  const paidBack =
    branch.grades.reduce(
      (sum, grade) => sum + Math.max(0, economyGold(grade.stats) - currentEconomy),
      0,
    ) / Math.max(1, branch.grades.length);
  const effectiveCost = Math.max(pathCost * TALENT_MIN_EFFECTIVE_COST_SHARE, pathCost - paidBack);
  const meanGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;

  return {
    branchId: branch.id,
    topGradeGain: gains.length > 0 ? gains[gains.length - 1] : 0,
    score: effectiveCost > 0 ? meanGain / effectiveCost : 0,
    pathCost,
    effectiveCost,
  };
}

/**
 * The branch worth more per gold for the tower at `ledgerIndex`; ties keep
 * the authored order. Null when no branch adds value (or valuation is none).
 */
export function selectBestBranch(
  ledger: RouteDamageLedger,
  ledgerIndex: number,
  branches: readonly BranchPath[],
  valuation: TalentValuation,
  branchCost: number,
): BranchValue | null {
  if (valuation === TalentValuation.NONE) {
    return null;
  }
  let best: BranchValue | null = null;
  for (const branch of branches) {
    const value = valueBranchPath(ledger, ledgerIndex, branch, valuation, branchCost);
    if (value.score > 0 && (best === null || value.score > best.score)) {
      best = value;
    }
  }
  return best;
}
