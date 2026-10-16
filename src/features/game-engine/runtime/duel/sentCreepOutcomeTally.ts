import {
  collectSentLeaks,
  getSentCreepTier,
  type DuelSide,
  type SentCreepOutcomesByField,
} from '../../../../entities/duel-match';
import type { CreepEntity } from '../../../../entities/creep';
import type { UnitTier } from '../../../../entities/unit';

/**
 * The scene removes a dead creep from its field once its death animation ends,
 * long before the wave settles, so the tiers of sent creeps that died are
 * counted as they die. Leaks stay on the field until the settle and are read
 * from it then. Reset at every wave start and restart.
 */
export type SentCreepDeathTally = Record<DuelSide, UnitTier[]>;

export function createSentCreepDeathTally(): SentCreepDeathTally {
  return { player: [], opponent: [] };
}

export function resetSentCreepDeathTally(tally: SentCreepDeathTally): void {
  tally.player.length = 0;
  tally.opponent.length = 0;
}

/** Counts a kill on `field` when the creep was sent; baseline kills earn nothing. */
export function recordSentCreepDeath(
  tally: SentCreepDeathTally,
  field: DuelSide,
  creep: CreepEntity,
): void {
  const tier = getSentCreepTier(creep);
  if (tier !== undefined) {
    tally[field].push(tier);
  }
}

/** The settle's sent creep outcomes: tallied deaths plus the leaks still on each field. */
export function buildSentCreepOutcomes(
  tally: SentCreepDeathTally,
  playerFieldCreeps: readonly CreepEntity[],
  opponentFieldCreeps: readonly CreepEntity[],
): SentCreepOutcomesByField {
  return {
    onPlayerField: {
      diedTiers: [...tally.player],
      leaks: collectSentLeaks(playerFieldCreeps),
    },
    onOpponentField: {
      diedTiers: [...tally.opponent],
      leaks: collectSentLeaks(opponentFieldCreeps),
    },
  };
}
