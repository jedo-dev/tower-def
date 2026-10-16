import { CREATURE_ABILITY_BALANCE } from '../../../shared/constants/creatureAbilities';
import { getCreepLeakLives } from '../../creep/model/abilities';
import type { CreepEntity } from '../../creep/model/types';
import type { DuelMatchState, DuelSide } from './types';

/**
 * Economy and life accounting of the creature abilities (tower-def-716.2):
 * `leakLivesTaken`, `leakGoldToSender` and `killGoldPenaltyToDefender`. The
 * game scene and the headless duel both settle a wave through these, so a
 * creature with no abilities counts as one life per leak and pays nothing.
 */

type LeakedCreep = Pick<CreepEntity, 'status' | 'sender' | 'abilities'>;

/** Lives every creep that leaked on a field takes: one each unless authored. */
export function countLeakedLives(creeps: readonly LeakedCreep[]): number {
  let lives = 0;
  for (const creep of creeps) {
    if (creep.status === 'escaped') {
      lives += getCreepLeakLives(creep);
    }
  }
  return lives;
}

/** Lives the sent creeps that leaked on a field take; what steals lives for the sender. */
export function countLeakedSentLives(creeps: readonly LeakedCreep[]): number {
  let lives = 0;
  for (const creep of creeps) {
    if (creep.status === 'escaped' && creep.sender !== undefined) {
      lives += getCreepLeakLives(creep);
    }
  }
  return lives;
}

/** Gold the sender earns from its creeps that leaked on a field (`leakGoldToSender`). */
export function sumLeakGoldToSender(creeps: readonly LeakedCreep[]): number {
  let gold = 0;
  for (const creep of creeps) {
    if (creep.status === 'escaped' && creep.sender !== undefined) {
      gold += creep.abilities?.leakGoldToSender ?? 0;
    }
  }
  return gold;
}

/** Gold the defender loses for killing this creep (`killGoldPenaltyToDefender`). */
export function getKillGoldPenalty(creep: Pick<CreepEntity, 'abilities'>): number {
  return creep.abilities?.killGoldPenaltyToDefender ?? 0;
}

/** A purse after a charge; never below `minimumDefenderGold`. */
export function chargeGold(gold: number, amount: number): number {
  if (amount <= 0) {
    return gold;
  }
  return Math.max(CREATURE_ABILITY_BALANCE.minimumDefenderGold, gold - amount);
}

/** Charges a side's purse in the duel state (kill penalties summed over a wave). */
export function chargeSideGold(
  state: DuelMatchState,
  side: DuelSide,
  amount: number,
): DuelMatchState {
  if (amount <= 0) {
    return state;
  }
  const duelist = state[side];
  return { ...state, [side]: { ...duelist, gold: chargeGold(duelist.gold, amount) } };
}
