export {
  DUEL_MATCH_BALANCE,
  DuelBalanceConfig,
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
  SEND_UNIT_TYPE_CAP_BY_TIER,
} from './model/balance';
export type { AddCreepEntry, BattlefieldLeakResult, BattlefieldState } from './model/battlefield';
export {
  canPlayerInteractWithVisibleBattlefield,
  createVisibleBattlefieldSnapshot,
} from './model/battlefieldView';
export {
  addCreeps,
  addTower,
  countAliveCreeps,
  countLeakedCreeps,
  createBattlefieldState,
  markDeadCreeps,
  markLeakedCreeps,
  removeDeadCreeps,
  removeLeakedCreeps,
  reconcileBattlefieldsForNextRound,
  refreshBattlefieldRoutes,
  refreshOpponentRoutesForWaveStart,
  removeTower,
} from './model/battlefieldOps';
export {
  canAffordSendCreep,
  clearSendQueue,
  endRound,
  generateBaselineWaveId,
  payIncome,
  sendCreep,
  settleRound,
  startRound,
} from './model/lifecycle';
export type { DuelRoundSettlement } from './model/lifecycle';
export { resolveDuelMatchOutcome } from './model/matchOutcome';
export type { DuelWaveOutcomeFacts } from './model/matchOutcome';
export {
  canAffordSend,
  getIncomeBonusByTier,
  getSendCostByTier,
  lookupTierValue,
} from './model/sendEconomy';
export { getSendTierDisplay, listSendTierDisplays } from './model/sendEconomyDisplay';
export type { SendTierDisplay } from './model/sendEconomyDisplay';
export {
  checkSendLimits,
  countQueuedSendsOfUnit,
  countRemainingSendsOfUnit,
  countRemainingWaveSends,
  getSendCapPerWave,
  getUnitTypeSendCapByTier,
} from './model/sendLimits';
export type { SendLimitCheck } from './model/sendLimits';
export { addKillBounty, awardKillBounty, getKillBountyGold } from './model/killBounty';
export {
  accrueStolenLives,
  countLeakedSentCreeps,
  countLivesTakenBySends,
  NO_SENT_CREEP_LEAKS,
} from './model/lifeSteal';
export type { LifeStealAccrual, SentCreepLeaks } from './model/lifeSteal';
export { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from './model/state';
export type { BattlefieldInitParams } from './model/state';
export type {
  DuelIncomePayoutResult,
  DuelMatchConfig,
  DuelMatchEndReason,
  DuelMatchOutcome,
  DuelMatchState,
  DuelPhase,
  DuelRoundEndResult,
  DuelRoundNumber,
  DuelRoundStartResult,
  DuelSendCreepResult,
  DuelSendLimitRejectionReason,
  DuelSendRejectionReason,
  DuelSide,
  DuelistState,
  TierEconomyTable,
} from './model/types';
export type {
  BattlefieldPlayerInteraction,
  VisibleBattlefieldSnapshot,
} from './model/battlefieldView';
