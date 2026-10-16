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
import { resolveDuelMatchOutcome } from './matchOutcome';
import {
  accrueSentCreepXp,
  NO_SENT_CREEP_OUTCOMES,
  type SentCreepOutcomesByField,
} from './creatureXp';
import { getCreatureGrade } from '../../unit/model/talents';
import type {
  DuelIncomePayoutResult,
  DuelMatchState,
  DuelRoundEndResult,
  DuelRoundStartResult,
  DuelSendCreepResult,
  DuelSide,
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

/**
 * Income that standing towers add to each side's payout this round (support
 * auras with `incomePerRound`). Computed by the caller from the towers it
 * fights with; none by default.
 */
export type DuelTowerIncome = { player: number; opponent: number };

export const NO_TOWER_INCOME: DuelTowerIncome = { player: 0, opponent: 0 };

export function payIncome(
  state: DuelMatchState,
  towerIncome: DuelTowerIncome = NO_TOWER_INCOME,
): DuelIncomePayoutResult {
  const playerIncomePaid = state.player.income + towerIncome.player;
  const opponentIncomePaid = state.opponent.income + towerIncome.opponent;

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

function resolveWinnerRace(
  state: DuelMatchState,
  winningSide: DuelSide | null,
): DuelRoundEndResult['winner'] {
  if (winningSide === null) {
    return null;
  }
  return winningSide === 'player' ? state.player.raceId : state.opponent.raceId;
}

/**
 * Resolves a round's leaks. `playerLeakedCreeps` and `opponentLeakedCreeps` are
 * every creep that leaked on that side's field; `sentLeaks` says how many of
 * them were sent by the other side, which is what steals lives for the sender.
 * A side that hits 0 HP is out even if its own sends stole lives this round.
 * When both hit 0 on the same wave, `resolveDuelMatchOutcome` breaks the tie.
 * `sentOutcomes` lists the tiers of the sent creeps that died or leaked on
 * each field; their senders earn creature experience (`accrueSentCreepXp`).
 */
export function endRound(
  state: DuelMatchState,
  playerLeakedCreeps: number,
  opponentLeakedCreeps: number,
  sentLeaks: SentCreepLeaks = NO_SENT_CREEP_LEAKS,
  sentOutcomes: SentCreepOutcomesByField = NO_SENT_CREEP_OUTCOMES,
): DuelRoundEndResult {
  const playerHpLost = playerLeakedCreeps * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep;
  const opponentHpLost = opponentLeakedCreeps * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep;

  const newPlayerHp = Math.max(0, state.player.hp - playerHpLost);
  const newOpponentHp = Math.max(0, state.opponent.hp - opponentHpLost);

  const isPlayerDead = newPlayerHp <= 0;
  const isOpponentDead = newOpponentHp <= 0;

  const livesTakenBySends = {
    onPlayerField: countLivesTakenBySends(state.player.hp, newPlayerHp, sentLeaks.onPlayerField),
    onOpponentField: countLivesTakenBySends(
      state.opponent.hp,
      newOpponentHp,
      sentLeaks.onOpponentField,
    ),
  };
  const playerSteal = accrueStolenLives(
    state.player.lifeStealRemainder,
    livesTakenBySends.onOpponentField,
  );
  const opponentSteal = accrueStolenLives(
    state.opponent.lifeStealRemainder,
    livesTakenBySends.onPlayerField,
  );
  const playerLivesStolen = isPlayerDead ? 0 : playerSteal.livesGained;
  const opponentLivesStolen = isOpponentDead ? 0 : opponentSteal.livesGained;
  const outcome = resolveDuelMatchOutcome({
    playerHpBefore: state.player.hp,
    opponentHpBefore: state.opponent.hp,
    playerHpAfter: newPlayerHp,
    opponentHpAfter: newOpponentHp,
    playerLeakedCreeps,
    opponentLeakedCreeps,
  });
  const isMatchOver = outcome.reason !== null;
  const winner = resolveWinnerRace(state, outcome.winningSide);
  const settledState: DuelMatchState = {
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
  };

  return {
    state: accrueSentCreepXp(settledState, sentOutcomes, livesTakenBySends),
    playerHpLost,
    opponentHpLost,
    playerLivesStolen,
    opponentLivesStolen,
    isMatchOver,
    winner,
    winningSide: outcome.winningSide,
    endReason: outcome.reason,
  };
}

export type DuelRoundSettlement = DuelRoundEndResult & {
  playerIncomePaid: number;
  opponentIncomePaid: number;
};

/**
 * End of a wave: resolves the leaks (`endRound`) and, unless that ended the
 * match, pays both sides their income (plus any tower income) for the next
 * build phase.
 */
export function settleRound(
  state: DuelMatchState,
  playerLeakedCreeps: number,
  opponentLeakedCreeps: number,
  sentLeaks: SentCreepLeaks = NO_SENT_CREEP_LEAKS,
  towerIncome: DuelTowerIncome = NO_TOWER_INCOME,
  sentOutcomes: SentCreepOutcomesByField = NO_SENT_CREEP_OUTCOMES,
): DuelRoundSettlement {
  const result = endRound(state, playerLeakedCreeps, opponentLeakedCreeps, sentLeaks, sentOutcomes);
  if (result.isMatchOver) {
    return { ...result, playerIncomePaid: 0, opponentIncomePaid: 0 };
  }

  const payout = payIncome(result.state, towerIncome);
  return {
    ...result,
    state: payout.state,
    playerIncomePaid: payout.playerIncomePaid,
    opponentIncomePaid: payout.opponentIncomePaid,
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
    // The grade at send time travels with the send (docs/08 "Creature talents").
    sendQueueGrades: [
      ...duelist.sendQueueGrades,
      getCreatureGrade(creepId, duelist.creatureGrades),
    ],
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
      sendQueueGrades: [],
    },
    opponent: {
      ...state.opponent,
      sendQueue: [],
      sendQueueGrades: [],
    },
  };
}
