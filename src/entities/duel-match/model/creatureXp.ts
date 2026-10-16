import type { CreepEntity } from '../../creep/model/types';
import { addCreatureXp, getCreatureDeathXp, getCreatureLeakXp } from '../../unit/model/talents';
import { UNIT_TIERS, type UnitTier } from '../../unit/model/types';
import { DUEL_MATCH_BALANCE } from './balance';
import type { DuelMatchState, DuelSide } from './types';

/**
 * Creature experience (docs/12-unit-talents-ru.md, "Опыт"). Every creep a side
 * sent earns that side experience of the creep's tier when the wave settles:
 * `DEATH_PER_TIER * tier` if it died on the other field, `LEAK_PER_TIER * tier`
 * if it leaked, plus `LEAK_TOOK_LIFE_BONUS` when that leak cost the defender a
 * life. Baseline creeps belong to no one and earn nothing.
 */

/** What one field saw of the creeps the other side sent, by creature tier. */
export type SentCreepOutcomes = {
  diedTiers: readonly UnitTier[];
  leakedTiers: readonly UnitTier[];
};

/** Sent creep outcomes by the field they happened on (the sender is the other side). */
export type SentCreepOutcomesByField = {
  onPlayerField: SentCreepOutcomes;
  onOpponentField: SentCreepOutcomes;
};

export const NO_SENT_CREEP_OUTCOMES_ON_FIELD: SentCreepOutcomes = Object.freeze({
  diedTiers: [],
  leakedTiers: [],
});

export const NO_SENT_CREEP_OUTCOMES: SentCreepOutcomesByField = Object.freeze({
  onPlayerField: NO_SENT_CREEP_OUTCOMES_ON_FIELD,
  onOpponentField: NO_SENT_CREEP_OUTCOMES_ON_FIELD,
});

/** Lives the sends took on each field this round (`countLivesTakenBySends`). */
export type LivesTakenBySendsByField = {
  onPlayerField: number;
  onOpponentField: number;
};

type SentCreepFacts = Pick<CreepEntity, 'status' | 'sender' | 'sentTier'>;

/** The tier a sent creep earns experience for, or undefined for a baseline creep. */
export function getSentCreepTier(creep: SentCreepFacts): UnitTier | undefined {
  if (creep.sender === undefined || creep.sentTier === undefined) {
    return undefined;
  }
  return UNIT_TIERS.find((tier) => tier === creep.sentTier);
}

/** Tiers of the sent creeps that leaked, in field order. */
export function collectSentLeakTiers(creeps: readonly SentCreepFacts[]): UnitTier[] {
  const tiers: UnitTier[] = [];
  for (const creep of creeps) {
    const tier = creep.status === 'escaped' ? getSentCreepTier(creep) : undefined;
    if (tier !== undefined) {
      tiers.push(tier);
    }
  }
  return tiers;
}

/** Tiers of the sent creeps that died, in field order. */
export function collectSentDeathTiers(creeps: readonly SentCreepFacts[]): UnitTier[] {
  const tiers: UnitTier[] = [];
  for (const creep of creeps) {
    const tier = creep.status === 'dead' ? getSentCreepTier(creep) : undefined;
    if (tier !== undefined) {
      tiers.push(tier);
    }
  }
  return tiers;
}

/**
 * Experience one side earns from its sends' outcomes on the other field. The
 * leaks that cost the defender a life are the first `livesTaken` worth of
 * leaks in field order: only the last leaks of a defender already at 0 lives
 * take none.
 */
function accrueFieldXp(
  state: DuelMatchState,
  sender: DuelSide,
  outcomes: SentCreepOutcomes,
  livesTaken: number,
): DuelMatchState {
  const leaksThatTookLife = Math.ceil(livesTaken / DUEL_MATCH_BALANCE.hpLossPerLeakedCreep);
  let xpByTier = state[sender].creatureXpByTier;

  for (const tier of outcomes.diedTiers) {
    xpByTier = addCreatureXp(xpByTier, tier, getCreatureDeathXp(tier));
  }
  outcomes.leakedTiers.forEach((tier, index) => {
    xpByTier = addCreatureXp(xpByTier, tier, getCreatureLeakXp(tier, index < leaksThatTookLife));
  });

  if (xpByTier === state[sender].creatureXpByTier) {
    return state;
  }
  return { ...state, [sender]: { ...state[sender], creatureXpByTier: xpByTier } };
}

/** Credits both senders: creeps on the player's field were sent by the opponent and back. */
export function accrueSentCreepXp(
  state: DuelMatchState,
  outcomes: SentCreepOutcomesByField,
  livesTaken: LivesTakenBySendsByField,
): DuelMatchState {
  const afterOpponentSends = accrueFieldXp(
    state,
    'opponent',
    outcomes.onPlayerField,
    livesTaken.onPlayerField,
  );
  return accrueFieldXp(
    afterOpponentSends,
    'player',
    outcomes.onOpponentField,
    livesTaken.onOpponentField,
  );
}
