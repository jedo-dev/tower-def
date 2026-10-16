import { DUEL_MATCH_BALANCE } from './balance';
import type { DuelMatchState, DuelSide } from './types';

/**
 * Kill bounty, identical for both sides: a creep killed on a side's own
 * battlefield pays that side. Difficulty never scales it.
 */
export function getKillBountyGold(): number {
  return DUEL_MATCH_BALANCE.killBountyGold;
}

/**
 * A purse after one kill bounty; used where a side's wallet lives outside the
 * duel state. `bonusGold` is extra gold the killing tower earns on top (a
 * support aura's `goldPerKill`); none by default.
 */
export function addKillBounty(gold: number, bonusGold = 0): number {
  return gold + getKillBountyGold() + bonusGold;
}

export function awardKillBounty(
  state: DuelMatchState,
  side: DuelSide,
  bonusGold = 0,
): DuelMatchState {
  const duelist = state[side];
  return {
    ...state,
    [side]: { ...duelist, gold: addKillBounty(duelist.gold, bonusGold) },
  };
}

/** Extra gold paid outside the per-kill bounty (aura kill bonuses summed over a wave). */
export function awardBonusGold(
  state: DuelMatchState,
  side: DuelSide,
  gold: number,
): DuelMatchState {
  if (gold <= 0) {
    return state;
  }
  const duelist = state[side];
  return { ...state, [side]: { ...duelist, gold: duelist.gold + gold } };
}
