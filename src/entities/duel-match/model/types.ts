import type { RaceId } from '../../../shared/types/content-ids';
import type { UnitId } from '../../unit/model/types';
import type { UnitTier } from '../../unit/model/types';
import type { BattlefieldState } from './battlefield';

export type DuelRoundNumber = number;

export type DuelPhase = 'build' | 'battle';

export type DuelistState = {
  hp: number;
  gold: number;
  income: number;
  raceId: RaceId;
  sendQueue: UnitId[];
  battlefield: BattlefieldState;
  /** Lives this side's sends took that have not yet made a whole stolen life. */
  lifeStealRemainder: number;
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
  /** Lives each side gained from its own sends leaking on the other field. */
  playerLivesStolen: number;
  opponentLivesStolen: number;
  isMatchOver: boolean;
  winner: RaceId | null;
};

export type DuelSendLimitRejectionReason = 'wave_send_cap' | 'unit_type_send_cap';

export type DuelSendRejectionReason = 'insufficient_gold' | DuelSendLimitRejectionReason;

export type DuelSendCreepResult = {
  state: DuelMatchState;
  sent: boolean;
  cost: number;
  incomeBonus: number;
  /** Why the send was refused; `null` when it went through. */
  rejectionReason: DuelSendRejectionReason | null;
};

export type TierEconomyTable = Readonly<Record<UnitTier, number>>;

export type DuelMatchConfig = {
  startingHp: number;
  /** What each side opens with; the start is always equal. */
  startingGold: number;
  startingIncome: number;
  sendCreepCostByTier: TierEconomyTable;
  sendCreepIncomeBonusByTier: TierEconomyTable;
  hpLossPerLeakedCreep: number;
  /** Lives a side's sends must take for the sender to gain one life. */
  leakedLivesPerStolenLife: number;
  /** Shared by both sides: total creeps one side may queue for one wave. */
  sendCapPerWave: number;
  /** Shared by both sides: creeps of one type one side may queue for one wave. */
  sendUnitTypeCapByTier: TierEconomyTable;
  /** Shared by both sides: gold a kill on a side's own battlefield pays that side. */
  killBountyGold: number;
};

export type DuelSide = 'player' | 'opponent';
