import { DUEL_MATCH_BALANCE } from './balance';
import type { DuelMatchState, DuelSide } from './types';

/**
 * Kill bounty, identical for both sides: a creep killed on a side's own
 * battlefield pays that side. Difficulty never scales it.
 */
export function getKillBountyGold(): number {
  return DUEL_MATCH_BALANCE.killBountyGold;
}

/** A purse after one kill bounty; used where a side's wallet lives outside the duel state. */
export function addKillBounty(gold: number): number {
  return gold + getKillBountyGold();
}

export function awardKillBounty(state: DuelMatchState, side: DuelSide): DuelMatchState {
  const duelist = state[side];
  return {
    ...state,
    [side]: { ...duelist, gold: addKillBounty(duelist.gold) },
  };
}
