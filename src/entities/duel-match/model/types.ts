import type { RaceId } from '../../../shared/types/content-ids';
import type { UnitId } from '../../unit/model/types';
import type { UnitTier } from '../../unit/model/types';

export type DuelRoundNumber = number;

export type DuelPhase = 'build' | 'battle';

export type DuelistState = {
  hp: number;
  gold: number;
  income: number;
  raceId: RaceId;
  sendQueue: UnitId[];
};

export type DuelMatchState = {
  round: DuelRoundNumber;
  phase: DuelPhase;
  player: DuelistState;
  opponent: DuelistState;
  baselineWaveId: string;
};

export type DuelRoundStartResult = {
  state: DuelMatchState;
  baselineWaveId: string;
};

export type DuelIncomePayoutResult = {
  state: DuelMatchState;
  playerIncomePaid: number;
  opponentIncomePaid: number;
};

export type DuelRoundEndResult = {
  state: DuelMatchState;
  playerHpLost: number;
  opponentHpLost: number;
  isMatchOver: boolean;
  winner: RaceId | null;
};

export type DuelSendCreepResult = {
  state: DuelMatchState;
  sent: boolean;
  cost: number;
  incomeBonus: number;
};

export type TierEconomyTable = Readonly<Record<UnitTier, number>>;

export type DuelMatchConfig = {
  startingHp: number;
  startingGold: number;
  startingIncome: number;
  sendCreepCostByTier: TierEconomyTable;
  sendCreepIncomeBonusByTier: TierEconomyTable;
  hpLossPerLeakedCreep: number;
};
