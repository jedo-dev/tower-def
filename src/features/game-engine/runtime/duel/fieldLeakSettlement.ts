import type { CreepEntity } from '../../../../entities/creep';
import {
  countLeakedLives,
  countLeakedSentLives,
  sumLeakGoldToSender,
  type SentCreepLeaks,
} from '../../../../entities/duel-match';

/**
 * What the two fields' leaks settle at the end of a wave: lives each side
 * loses (`leakLivesTaken`, one per leak by default), lives the sends took (for
 * life steal) and the leak gold each sender earns (`leakGoldToSender`). The
 * player's sends leak on the opponent's field and the other way round.
 */
export type FieldLeakSettlement = {
  playerLeakedLives: number;
  opponentLeakedLives: number;
  sentLeaks: SentCreepLeaks;
  leakGoldToPlayer: number;
  leakGoldToOpponent: number;
};

export function summarizeFieldLeaks(
  playerFieldCreeps: readonly CreepEntity[],
  opponentFieldCreeps: readonly CreepEntity[],
): FieldLeakSettlement {
  return {
    playerLeakedLives: countLeakedLives(playerFieldCreeps),
    opponentLeakedLives: countLeakedLives(opponentFieldCreeps),
    sentLeaks: {
      onPlayerField: countLeakedSentLives(playerFieldCreeps),
      onOpponentField: countLeakedSentLives(opponentFieldCreeps),
    },
    leakGoldToPlayer: sumLeakGoldToSender(opponentFieldCreeps),
    leakGoldToOpponent: sumLeakGoldToSender(playerFieldCreeps),
  };
}
