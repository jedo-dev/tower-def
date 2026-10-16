import type { TowerBranchChoices } from '../../../tower/model/talents';
import type { TowerEntity } from '../../../tower/model/types';
import { getTotalInvestedGold } from '../../../tower/model/upgrade';
import type { TowerUpgradeLevel } from '../../../tower/model/upgradeConfig';
import type { RouteDamageLedger } from '../damage-placement/routeDamageLedger';

/** Whether any grade of the branch pays gold (aura `incomePerRound` or `goldPerKill`). */
export function hasEconomyGrades(grades: readonly TowerUpgradeLevel[]): boolean {
  return grades.some(
    (grade) =>
      (grade.stats.aura?.incomePerRound ?? 0) > 0 || (grade.stats.aura?.goldPerKill ?? 0) > 0,
  );
}

/**
 * Route value a gold buys on this board: what every tower adds on the ledger
 * over the gold it took (its price and its upgrades). Gold an economy talent
 * pays back is spent on the same board, so it is worth this much a gold.
 * `towers[i]` is `ledger.towers[i]`. Zero on an empty board.
 */
export function computeBoardValuePerGold(
  towers: readonly TowerEntity[],
  ledger: RouteDamageLedger,
  choices: TowerBranchChoices,
): number {
  let value = 0;
  let gold = 0;
  towers.forEach((tower, index) => {
    value += ledger.contributionOf(ledger.towers[index], index);
    gold += tower.cost + getTotalInvestedGold(tower, tower.level, choices);
  });
  return gold > 0 ? value / gold : 0;
}
