import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import { addKillBounty, awardBonusGold, awardKillBounty, getKillBountyGold } from './killBounty';
import { NO_TOWER_INCOME, payIncome, settleRound } from './lifecycle';
import { createInitialDuelMatchState } from './state';

// Tower-driven economy hooks (tower-def-bge.2): aura kill bonuses and tower
// income, both zero unless a caller passes them.

describe('kill bounty bonus', () => {
  it('adds the killing tower bonus on top of the shared bounty', () => {
    expect(addKillBounty(10)).toBe(10 + getKillBountyGold());
    expect(addKillBounty(10, 3)).toBe(10 + getKillBountyGold() + 3);
  });

  it('pays the bonus into the duel state for the side that killed', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const next = awardKillBounty(state, 'opponent', 2);

    expect(next.opponent.gold).toBe(state.opponent.gold + getKillBountyGold() + 2);
    expect(next.player.gold).toBe(state.player.gold);
  });

  it('pays summed bonus gold, and nothing for zero', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    expect(awardBonusGold(state, 'player', 7).player.gold).toBe(state.player.gold + 7);
    expect(awardBonusGold(state, 'player', 0)).toBe(state);
  });
});

describe('tower income', () => {
  it('adds each side tower income to its payout', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const payout = payIncome(state, { player: 5, opponent: 1 });

    expect(payout.playerIncomePaid).toBe(state.player.income + 5);
    expect(payout.opponentIncomePaid).toBe(state.opponent.income + 1);
    expect(payout.state.player.gold).toBe(state.player.gold + state.player.income + 5);
    expect(payout.state.player.income).toBe(state.player.income);
  });

  it('is paid at settle unless the round ends the match', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    const settled = settleRound(state, 0, 0, undefined, { player: 4, opponent: 0 });
    expect(settled.playerIncomePaid).toBe(state.player.income + 4);

    const over = settleRound(state, 0, DUEL_MATCH_BALANCE.startingHp, undefined, {
      player: 4,
      opponent: 0,
    });
    expect(over.playerIncomePaid).toBe(0);
  });

  it('changes nothing when omitted', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

    expect(payIncome(state)).toEqual(payIncome(state, NO_TOWER_INCOME));
  });
});
