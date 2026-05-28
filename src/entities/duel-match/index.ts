export { DUEL_MATCH_BALANCE, DuelBalanceConfig } from './model/balance';
export {
  canAffordSendCreep,
  clearSendQueue,
  endRound,
  generateBaselineWaveId,
  payIncome,
  sendCreep,
  startRound,
} from './model/lifecycle';
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
} from './model/types';
