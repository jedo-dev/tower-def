import type { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import type { DuelMatchState, DuelistState } from './types';

function createDuelistState(raceId: RaceId): DuelistState {
  return {
    hp: DUEL_MATCH_BALANCE.startingHp,
    gold: DUEL_MATCH_BALANCE.startingGold,
    income: DUEL_MATCH_BALANCE.startingIncome,
    raceId,
    sendQueue: [],
  };
}

export function createInitialDuelMatchState(
  playerRaceId: RaceId,
  opponentRaceId: RaceId,
): DuelMatchState {
  return {
    round: 0,
    phase: 'build',
    player: createDuelistState(playerRaceId),
    opponent: createDuelistState(opponentRaceId),
    baselineWaveId: '',
  };
}
