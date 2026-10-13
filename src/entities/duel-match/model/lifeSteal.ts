import type { CreepEntity } from '../../creep/model/types';
import { DUEL_MATCH_BALANCE } from './balance';

/**
 * Leaks steal lives. When a creep one side sent leaks on the other side's
 * field, the defender loses lives as usual and the sender banks them: every
 * `leakedLivesPerStolenLife` lives its sends take become one life for it.
 * Baseline wave creeps belong to no one and steal nothing.
 *
 * The bank is an integer remainder carried between rounds, so the rule is
 * deterministic and no fraction is ever lost or rounded away.
 */

/** Sent creeps that leaked this round, by the field they leaked on. */
export type SentCreepLeaks = {
  onPlayerField: number;
  onOpponentField: number;
};

export const NO_SENT_CREEP_LEAKS: SentCreepLeaks = { onPlayerField: 0, onOpponentField: 0 };

export type LifeStealAccrual = {
  livesGained: number;
  /** Lives taken that have not yet added up to a whole stolen life. */
  remainder: number;
};

export function countLeakedSentCreeps(
  creeps: readonly Pick<CreepEntity, 'status' | 'sender'>[],
): number {
  let count = 0;
  for (const creep of creeps) {
    if (creep.status === 'escaped' && creep.sender !== undefined) {
      count += 1;
    }
  }
  return count;
}

/** Lives the sends actually took: never more than the defender really lost. */
export function countLivesTakenBySends(
  hpBefore: number,
  hpAfter: number,
  leakedSentCreeps: number,
): number {
  const livesLost = Math.max(0, hpBefore - hpAfter);
  return Math.min(livesLost, leakedSentCreeps * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep);
}

export function accrueStolenLives(remainder: number, livesTaken: number): LifeStealAccrual {
  const livesPerStolenLife = DUEL_MATCH_BALANCE.leakedLivesPerStolenLife;
  const banked = remainder + livesTaken;

  return {
    livesGained: Math.floor(banked / livesPerStolenLife),
    remainder: banked % livesPerStolenLife,
  };
}
