import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import { endRound } from './lifecycle';
import {
  accrueStolenLives,
  countLeakedSentCreeps,
  countLivesTakenBySends,
  NO_SENT_CREEP_LEAKS,
} from './lifeSteal';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

const PLAYER_RACE = RaceId.UNDEAD;
const OPPONENT_RACE = RaceId.ORC;
const LIVES_PER_STEAL = DUEL_MATCH_BALANCE.leakedLivesPerStolenLife;
const START_HP = DUEL_MATCH_BALANCE.startingHp;

function createState(playerHp = START_HP, opponentHp = START_HP): DuelMatchState {
  const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);
  return {
    ...state,
    player: { ...state.player, hp: playerHp },
    opponent: { ...state.opponent, hp: opponentHp },
  };
}

describe('entities/duel-match/lifeSteal', () => {
  it('steals one life per configured number of lives taken', () => {
    expect(LIVES_PER_STEAL).toBe(2);
    expect(accrueStolenLives(0, 4)).toEqual({ livesGained: 2, remainder: 0 });
    expect(accrueStolenLives(0, 3)).toEqual({ livesGained: 1, remainder: 1 });
    expect(accrueStolenLives(1, 1)).toEqual({ livesGained: 1, remainder: 0 });
    expect(accrueStolenLives(0, 0)).toEqual({ livesGained: 0, remainder: 0 });
  });

  it('counts only escaped creeps that someone sent', () => {
    expect(
      countLeakedSentCreeps([
        { status: 'escaped', sender: 'opponent' },
        { status: 'escaped' },
        { status: 'alive', sender: 'opponent' },
        { status: 'dead', sender: 'opponent' },
        { status: 'escaped', sender: 'opponent' },
      ]),
    ).toBe(2);
  });

  it('never credits sends with more lives than the defender lost', () => {
    expect(countLivesTakenBySends(3, 0, 10)).toBe(3);
    expect(countLivesTakenBySends(20, 15, 2)).toBe(2);
  });
});

describe('entities/duel-match/endRound life steal', () => {
  it('transfers lives from leaked sends to the sender', () => {
    const result = endRound(createState(), 0, 4, { onPlayerField: 0, onOpponentField: 4 });

    expect(result.state.opponent.hp).toBe(START_HP - 4);
    expect(result.state.player.hp).toBe(START_HP + 2);
    expect(result.playerLivesStolen).toBe(2);
    expect(result.opponentLivesStolen).toBe(0);
  });

  it('works the same for the computer sending at the player', () => {
    const result = endRound(createState(), 6, 0, { onPlayerField: 6, onOpponentField: 0 });

    expect(result.state.player.hp).toBe(START_HP - 6);
    expect(result.state.opponent.hp).toBe(START_HP + 3);
    expect(result.opponentLivesStolen).toBe(3);
  });

  it('grants nothing for baseline wave leaks', () => {
    const result = endRound(createState(), 3, 5, NO_SENT_CREEP_LEAKS);

    expect(result.state.player.hp).toBe(START_HP - 3);
    expect(result.state.opponent.hp).toBe(START_HP - 5);
    expect(result.playerLivesStolen).toBe(0);
    expect(result.opponentLivesStolen).toBe(0);
  });

  it('counts only the sent share of mixed leaks', () => {
    const result = endRound(createState(), 0, 5, { onPlayerField: 0, onOpponentField: 2 });

    expect(result.state.opponent.hp).toBe(START_HP - 5);
    expect(result.state.player.hp).toBe(START_HP + 1);
  });

  it('carries an odd leftover into the next round', () => {
    const first = endRound(createState(), 0, 1, { onPlayerField: 0, onOpponentField: 1 });
    expect(first.playerLivesStolen).toBe(0);
    expect(first.state.player.lifeStealRemainder).toBe(1);

    const second = endRound(first.state, 0, 1, { onPlayerField: 0, onOpponentField: 1 });
    expect(second.playerLivesStolen).toBe(1);
    expect(second.state.player.hp).toBe(START_HP + 1);
    expect(second.state.player.lifeStealRemainder).toBe(0);
  });

  it('ends the match when a side hits 0 even though the other gains', () => {
    const result = endRound(createState(START_HP, 2), 0, 4, {
      onPlayerField: 0,
      onOpponentField: 4,
    });

    expect(result.state.opponent.hp).toBe(0);
    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(PLAYER_RACE);
    // Only the two lives the opponent actually had were taken.
    expect(result.playerLivesStolen).toBe(1);
    expect(result.state.player.hp).toBe(START_HP + 1);
  });

  it('does not let stolen lives save a side that hit 0 this round', () => {
    const result = endRound(createState(1, START_HP), 1, 4, {
      onPlayerField: 0,
      onOpponentField: 4,
    });

    expect(result.state.player.hp).toBe(0);
    expect(result.playerLivesStolen).toBe(0);
    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(OPPONENT_RACE);
  });
});
