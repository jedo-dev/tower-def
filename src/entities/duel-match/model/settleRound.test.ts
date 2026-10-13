import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import { settleRound } from './lifecycle';
import { createInitialDuelMatchState } from './state';

describe('entities/duel-match/settleRound', () => {
  it('resolves leaks and then pays both incomes', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const result = settleRound(state, 2, 0);

    expect(result.state.player.hp).toBe(
      DUEL_MATCH_BALANCE.startingHp - 2 * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep,
    );
    expect(result.playerIncomePaid).toBe(state.player.income);
    expect(result.state.opponent.gold).toBe(state.opponent.gold + state.opponent.income);
    expect(result.isMatchOver).toBe(false);
  });

  it('pays no income once the match is over', () => {
    const state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);
    const result = settleRound(state, 0, DUEL_MATCH_BALANCE.startingHp);

    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(RaceId.UNDEAD);
    expect(result.opponentIncomePaid).toBe(0);
    expect(result.state.player.gold).toBe(state.player.gold);
  });
});
