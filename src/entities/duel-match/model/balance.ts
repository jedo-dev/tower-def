import { UnitTier } from '../../unit/model/types';
import type { DuelMatchConfig, TierEconomyTable } from './types';

export enum DuelBalanceConfig {
  STARTING_HP = 20,
  STARTING_GOLD = 500,
  STARTING_INCOME = 50,
  HP_LOSS_PER_LEAKED_CREEP = 1,
}

export const SEND_CREEP_COST_BY_TIER: TierEconomyTable = {
  [UnitTier.TIER_1]: 50,
  [UnitTier.TIER_2]: 75,
  [UnitTier.TIER_3]: 110,
  [UnitTier.TIER_4]: 160,
  [UnitTier.TIER_5]: 230,
  [UnitTier.TIER_6]: 320,
} as const;

export const SEND_CREEP_INCOME_BONUS_BY_TIER: TierEconomyTable = {
  [UnitTier.TIER_1]: 10,
  [UnitTier.TIER_2]: 14,
  [UnitTier.TIER_3]: 19,
  [UnitTier.TIER_4]: 25,
  [UnitTier.TIER_5]: 32,
  [UnitTier.TIER_6]: 40,
} as const;

export const DUEL_MATCH_BALANCE: DuelMatchConfig = {
  startingHp: DuelBalanceConfig.STARTING_HP,
  startingGold: DuelBalanceConfig.STARTING_GOLD,
  startingIncome: DuelBalanceConfig.STARTING_INCOME,
  sendCreepCostByTier: SEND_CREEP_COST_BY_TIER,
  sendCreepIncomeBonusByTier: SEND_CREEP_INCOME_BONUS_BY_TIER,
  hpLossPerLeakedCreep: DuelBalanceConfig.HP_LOSS_PER_LEAKED_CREEP,
} as const;
