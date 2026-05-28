import type { DuelMatchConfig } from './types';

export enum DuelBalanceConfig {
  STARTING_HP = 20,
  STARTING_GOLD = 500,
  STARTING_INCOME = 50,
  SEND_CREEP_BASE_COST = 50,
  SEND_CREEP_INCOME_BONUS = 10,
  HP_LOSS_PER_LEAKED_CREEP = 1,
}

export const DUEL_MATCH_BALANCE: DuelMatchConfig = {
  startingHp: DuelBalanceConfig.STARTING_HP,
  startingGold: DuelBalanceConfig.STARTING_GOLD,
  startingIncome: DuelBalanceConfig.STARTING_INCOME,
  sendCreepBaseCost: DuelBalanceConfig.SEND_CREEP_BASE_COST,
  sendCreepIncomeBonus: DuelBalanceConfig.SEND_CREEP_INCOME_BONUS,
  hpLossPerLeakedCreep: DuelBalanceConfig.HP_LOSS_PER_LEAKED_CREEP,
} as const;
