import type { UnitTier } from '../../unit/model/types';
import { DUEL_MATCH_BALANCE } from './balance';
import type { TierEconomyTable } from './types';

export function getSendCostByTier(tier: UnitTier): number {
  const cost = DUEL_MATCH_BALANCE.sendCreepCostByTier[tier];
  if (cost === undefined) {
    throw new Error(`No send cost defined for tier: ${tier}`);
  }
  return cost;
}

export function getIncomeBonusByTier(tier: UnitTier): number {
  const bonus = DUEL_MATCH_BALANCE.sendCreepIncomeBonusByTier[tier];
  if (bonus === undefined) {
    throw new Error(`No income bonus defined for tier: ${tier}`);
  }
  return bonus;
}

export function canAffordSend(
  gold: number,
  tier: UnitTier,
): boolean {
  return gold >= getSendCostByTier(tier);
}

export function lookupTierValue(
  table: TierEconomyTable,
  tier: UnitTier,
): number {
  const value = table[tier];
  if (value === undefined) {
    throw new Error(`No value defined for tier: ${tier}`);
  }
  return value;
}
