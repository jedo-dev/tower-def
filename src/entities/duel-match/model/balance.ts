import { UnitTier } from '../../unit/model/types';
import type { DuelMatchConfig, TierEconomyTable } from './types';

export enum DuelBalanceConfig {
  STARTING_HP = 20,
  /**
   * Both sides open on the same purse. Difficulty never tilts it: presets only
   * change how well the computer spends it.
   */
  STARTING_GOLD = 500,
  STARTING_INCOME = 50,
  HP_LOSS_PER_LEAKED_CREEP = 1,
  /**
   * Lives a side's sent creeps must take from the other side for the sender to
   * gain one life. Baseline wave leaks never count.
   */
  LEAKED_LIVES_PER_STOLEN_LIFE = 2,
  /** Most creeps one side may queue for a single wave, across every type. */
  SEND_CAP_PER_WAVE = 12,
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

/**
 * Most creeps of one type a side may queue for a single wave. Cheap creeps can
 * swarm; expensive ones stay a handful so a saved-up purse cannot dump a wall
 * of top-tier units in one round.
 */
export const SEND_UNIT_TYPE_CAP_BY_TIER: TierEconomyTable = {
  [UnitTier.TIER_1]: 6,
  [UnitTier.TIER_2]: 5,
  [UnitTier.TIER_3]: 4,
  [UnitTier.TIER_4]: 3,
  [UnitTier.TIER_5]: 3,
  [UnitTier.TIER_6]: 2,
} as const;

export const DUEL_MATCH_BALANCE: DuelMatchConfig = {
  startingHp: DuelBalanceConfig.STARTING_HP,
  startingGold: DuelBalanceConfig.STARTING_GOLD,
  startingIncome: DuelBalanceConfig.STARTING_INCOME,
  sendCreepCostByTier: SEND_CREEP_COST_BY_TIER,
  sendCreepIncomeBonusByTier: SEND_CREEP_INCOME_BONUS_BY_TIER,
  hpLossPerLeakedCreep: DuelBalanceConfig.HP_LOSS_PER_LEAKED_CREEP,
  leakedLivesPerStolenLife: DuelBalanceConfig.LEAKED_LIVES_PER_STOLEN_LIFE,
  sendCapPerWave: DuelBalanceConfig.SEND_CAP_PER_WAVE,
  sendUnitTypeCapByTier: SEND_UNIT_TYPE_CAP_BY_TIER,
} as const;
