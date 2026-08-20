export {
  DUEL_MATCH_BALANCE,
  DuelBalanceConfig,
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
} from './model/balance';
export type {
  AddCreepEntry,
  BattlefieldLeakResult,
  BattlefieldState,
} from './model/battlefield';
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
  removeTower,
  routeQueuedSendsToBattlefields,
} from './model/battlefieldOps';
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
export {
  createInitialDuelMatchState,
  DEFAULT_ENTRANCE,
  DEFAULT_EXIT,
} from './model/state';
export type {
  BattlefieldInitParams,
} from './model/state';
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
export type {
  BattlefieldPlayerInteraction,
  VisibleBattlefieldSnapshot,
} from './model/battlefieldView';
