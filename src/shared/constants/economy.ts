export enum EconomyBalanceConfig {
  STARTING_GOLD = 100,
  STARTING_LIVES = 20,
  TOWER_SELL_RATIO_PERCENT = 50,
  CREEP_KILL_REWARD_GOLD = 10,
  WAVE_COMPLETION_REWARD_GOLD = 25,
  EARLY_WAVE_START_BONUS_GOLD = 15,
}

export const ECONOMY_BALANCE = {
  startingGold: EconomyBalanceConfig.STARTING_GOLD,
  startingLives: EconomyBalanceConfig.STARTING_LIVES,
  towerSellRatio: EconomyBalanceConfig.TOWER_SELL_RATIO_PERCENT / 100,
  creepKillRewardGold: EconomyBalanceConfig.CREEP_KILL_REWARD_GOLD,
  waveCompletionRewardGold: EconomyBalanceConfig.WAVE_COMPLETION_REWARD_GOLD,
  earlyWaveStartBonusGold: EconomyBalanceConfig.EARLY_WAVE_START_BONUS_GOLD,
} as const;
