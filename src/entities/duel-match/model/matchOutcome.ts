import type { DuelMatchEndReason, DuelMatchOutcome, DuelSide } from './types';

/** What the last wave did to both sides, as far as deciding the match goes. */
export type DuelWaveOutcomeFacts = {
  playerHpBefore: number;
  opponentHpBefore: number;
  playerHpAfter: number;
  opponentHpAfter: number;
  playerLeakedCreeps: number;
  opponentLeakedCreeps: number;
};

const NO_OUTCOME: DuelMatchOutcome = { winningSide: null, reason: null };

function decide(winningSide: DuelSide | null, reason: DuelMatchEndReason): DuelMatchOutcome {
  return { winningSide, reason };
}

/**
 * Picks the side that leaked fewer creeps this wave, or `null` on a tie.
 */
function pickByFewerLeaks(facts: DuelWaveOutcomeFacts): DuelSide | null {
  if (facts.playerLeakedCreeps === facts.opponentLeakedCreeps) {
    return null;
  }
  return facts.playerLeakedCreeps < facts.opponentLeakedCreeps ? 'player' : 'opponent';
}

/**
 * Picks the side that went into the wave with more lives, or `null` on a tie.
 */
function pickByMoreLivesBefore(facts: DuelWaveOutcomeFacts): DuelSide | null {
  if (facts.playerHpBefore === facts.opponentHpBefore) {
    return null;
  }
  return facts.playerHpBefore > facts.opponentHpBefore ? 'player' : 'opponent';
}

/**
 * Decides the match after a wave. A side at 0 lives is out; if only one side
 * is out, the other wins by knockout. If both fell on the same wave, the side
 * that leaked fewer creeps that wave wins; on equal leaks, the side that had
 * more lives before the wave wins; only when both are equal is it a draw.
 * Returns no winner and no reason while both sides still have lives.
 */
export function resolveDuelMatchOutcome(facts: DuelWaveOutcomeFacts): DuelMatchOutcome {
  const isPlayerOut = facts.playerHpAfter <= 0;
  const isOpponentOut = facts.opponentHpAfter <= 0;

  if (!isPlayerOut && !isOpponentOut) {
    return NO_OUTCOME;
  }
  if (isPlayerOut !== isOpponentOut) {
    return decide(isOpponentOut ? 'player' : 'opponent', 'knockout');
  }

  const fewerLeaksSide = pickByFewerLeaks(facts);
  if (fewerLeaksSide !== null) {
    return decide(fewerLeaksSide, 'fewer_leaks');
  }

  const moreLivesSide = pickByMoreLivesBefore(facts);
  if (moreLivesSide !== null) {
    return decide(moreLivesSide, 'more_lives_before_wave');
  }

  return decide(null, 'draw');
}
