import type { UnitId, UnitTier } from '../../unit/model/types';
import { DUEL_MATCH_BALANCE } from './balance';
import { canAffordSend, getIncomeBonusByTier, getSendCostByTier } from './sendEconomy';
import { checkSendLimits } from './sendLimits';
import {
  accrueStolenLives,
  countLivesTakenBySends,
  NO_SENT_CREEP_LEAKS,
  type SentCreepLeaks,
} from './lifeSteal';
import type {
  DuelIncomePayoutResult,
  DuelMatchState,
  DuelRoundEndResult,
  DuelRoundStartResult,
  DuelSendCreepResult,
} from './types';

export function generateBaselineWaveId(round: number): string {
  return `baseline_wave_round_${round}`;
}

export function startRound(state: DuelMatchState): DuelRoundStartResult {
  const nextRound = state.round + 1;
  const baselineWaveId = generateBaselineWaveId(nextRound);

  return {
    state: {
      ...state,
      round: nextRound,
      phase: 'battle',
      baselineWaveId,
    },
    baselineWaveId,
  };
}

export function payIncome(state: DuelMatchState): DuelIncomePayoutResult {
  const playerIncomePaid = state.player.income;
  const opponentIncomePaid = state.opponent.income;

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        gold: state.player.gold + playerIncomePaid,
      },
      opponent: {
        ...state.opponent,
        gold: state.opponent.gold + opponentIncomePaid,
      },
    },
    playerIncomePaid,
    opponentIncomePaid,
  };
}

/**
 * Resolves a round's leaks. `playerLeakedCreeps` and `opponentLeakedCreeps` are
 * every creep that leaked on that side's field; `sentLeaks` says how many of
 * them were sent by the other side, which is what steals lives for the sender.
 * A side that hits 0 HP is out even if its own sends stole lives this round.
 */
export function endRound(
  state: DuelMatchState,
  playerLeakedCreeps: number,
  opponentLeakedCreeps: number,
  sentLeaks: SentCreepLeaks = NO_SENT_CREEP_LEAKS,
): DuelRoundEndResult {
  const playerHpLost = playerLeakedCreeps * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep;
  const opponentHpLost = opponentLeakedCreeps * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep;

  const newPlayerHp = Math.max(0, state.player.hp - playerHpLost);
  const newOpponentHp = Math.max(0, state.opponent.hp - opponentHpLost);

  const isPlayerDead = newPlayerHp <= 0;
  const isOpponentDead = newOpponentHp <= 0;

  const playerSteal = accrueStolenLives(
    state.player.lifeStealRemainder,
    countLivesTakenBySends(state.opponent.hp, newOpponentHp, sentLeaks.onOpponentField),
  );
  const opponentSteal = accrueStolenLives(
    state.opponent.lifeStealRemainder,
    countLivesTakenBySends(state.player.hp, newPlayerHp, sentLeaks.onPlayerField),
  );
  const playerLivesStolen = isPlayerDead ? 0 : playerSteal.livesGained;
  const opponentLivesStolen = isOpponentDead ? 0 : opponentSteal.livesGained;
  const isMatchOver = isPlayerDead || isOpponentDead;

  let winner: DuelRoundEndResult['winner'] = null;
  if (isMatchOver) {
    if (isPlayerDead && isOpponentDead) {
      winner = null;
    } else if (isOpponentDead) {
      winner = state.player.raceId;
    } else {
      winner = state.opponent.raceId;
    }
  }

  return {
    state: {
      ...state,
      phase: 'build',
      player: {
        ...state.player,
        hp: newPlayerHp + playerLivesStolen,
        lifeStealRemainder: playerSteal.remainder,
      },
      opponent: {
        ...state.opponent,
        hp: newOpponentHp + opponentLivesStolen,
        lifeStealRemainder: opponentSteal.remainder,
      },
    },
    playerHpLost,
    opponentHpLost,
    playerLivesStolen,
    opponentLivesStolen,
    isMatchOver,
    winner,
  };
}

export function sendCreep(
  state: DuelMatchState,
  isPlayer: boolean,
  creepId: UnitId,
  tier: UnitTier,
): DuelSendCreepResult {
  const duelist = isPlayer ? state.player : state.opponent;
  const cost = getSendCostByTier(tier);
  const incomeBonus = getIncomeBonusByTier(tier);

  const limitCheck = checkSendLimits(duelist.sendQueue, creepId, tier);
  if (!limitCheck.allowed) {
    return { state, sent: false, cost, incomeBonus, rejectionReason: limitCheck.reason };
  }

  if (!canAffordSend(duelist.gold, tier)) {
    return { state, sent: false, cost, incomeBonus, rejectionReason: 'insufficient_gold' };
  }

  const updatedDuelist = {
    ...duelist,
    gold: duelist.gold - cost,
    income: duelist.income + incomeBonus,
    sendQueue: [...duelist.sendQueue, creepId],
  };

  return {
    state: {
      ...state,
      ...(isPlayer ? { player: updatedDuelist } : { opponent: updatedDuelist }),
    },
    sent: true,
    cost,
    incomeBonus,
    rejectionReason: null,
  };
}

export function canAffordSendCreep(
  state: DuelMatchState,
  isPlayer: boolean,
  tier: UnitTier,
): boolean {
  const duelist = isPlayer ? state.player : state.opponent;
  return canAffordSend(duelist.gold, tier);
}

export function clearSendQueue(state: DuelMatchState): DuelMatchState {
  return {
    ...state,
    player: {
      ...state.player,
      sendQueue: [],
    },
    opponent: {
      ...state.opponent,
      sendQueue: [],
    },
  };
}
