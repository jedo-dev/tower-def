export {
  DUEL_MATCH_BALANCE,
  DuelBalanceConfig,
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
} from './model/balance';
export {
  canAffordSendCreep,
  clearSendQueue,
  endRound,
  generateBaselineWaveId,
  payIncome,
  sendCreep,
  startRound,
} from './model/lifecycle';
export {
  canAffordSend,
  getIncomeBonusByTier,
  getSendCostByTier,
  lookupTierValue,
} from './model/sendEconomy';
export { createInitialDuelMatchState } from './model/state';
export type {
  DuelIncomePayoutResult,
  DuelMatchConfig,
  DuelMatchState,
  DuelPhase,
  DuelRoundEndResult,
  DuelRoundNumber,
  DuelRoundStartResult,
  DuelSendCreepResult,
  DuelistState,
  TierEconomyTable,
} from './model/types';
