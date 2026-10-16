import { TOWER_ABILITY_BALANCE } from '../../../shared/constants/towerAbilities';
import { resolveTowerAura } from './auras';
import type { TowerEntity } from './types';

/**
 * Economy side of support auras: income while the tower stands, extra gold
 * per kill and a better sell refund for towers in radius. Read at the
 * round-settle, kill and sell moments, never per frame.
 */

/** Gold the side's standing towers add to its income payout this round. */
export function getTowersIncomePerRound(towers: readonly TowerEntity[]): number {
  let income = 0;

  for (const tower of towers) {
    income += resolveTowerAura(tower)?.incomePerRound ?? 0;
  }

  return income;
}

/** Extra gold a kill by this tower pays its owner (an aura's `goldPerKill`). */
export function getTowerKillBonusGold(tower: Pick<TowerEntity, 'auraBonus'>): number {
  return tower.auraBonus?.goldPerKill ?? 0;
}

/** The tower's sell refund ratio: the base ratio plus any aura bonus, capped. */
export function resolveTowerSellRefundRatio(
  tower: Pick<TowerEntity, 'auraBonus'>,
  baseRatio: number,
): number {
  return Math.min(
    TOWER_ABILITY_BALANCE.maxSellRefundRatio,
    baseRatio + (tower.auraBonus?.sellRefundBonus ?? 0),
  );
}
