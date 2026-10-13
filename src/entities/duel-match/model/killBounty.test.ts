import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import { addKillBounty, awardKillBounty, getKillBountyGold } from './killBounty';
import { createInitialDuelMatchState } from './state';

describe('kill bounty', () => {
  it('pays a positive bounty equal to the shared economy kill reward', () => {
    expect(getKillBountyGold()).toBeGreaterThan(0);
    expect(getKillBountyGold()).toBe(ECONOMY_BALANCE.creepKillRewardGold);
    expect(addKillBounty(30)).toBe(30 + getKillBountyGold());
  });

  it('pays the computer for a kill on its own battlefield', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    const next = awardKillBounty(state, 'opponent');

    expect(next.opponent.gold).toBe(state.opponent.gold + getKillBountyGold());
    expect(next.player.gold).toBe(state.player.gold);
  });

  it('pays the player for a kill on its own battlefield', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    const next = awardKillBounty(state, 'player');

    expect(next.player.gold).toBe(state.player.gold + getKillBountyGold());
    expect(next.opponent.gold).toBe(state.opponent.gold);
  });

  it('pays both sides the identical bounty', () => {
    const state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ELF);

    const playerGain = awardKillBounty(state, 'player').player.gold - state.player.gold;
    const opponentGain = awardKillBounty(state, 'opponent').opponent.gold - state.opponent.gold;

    expect(playerGain).toBe(opponentGain);
  });
});
