import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { createInitialDuelMatchState } from './state';
import { endRound, startRound } from './lifecycle';

const PLAYER_RACE = RaceId.HUMAN;
const OPPONENT_RACE = RaceId.ORC;

describe('entities/duel-match/outcome', () => {
  it('ends the match with player loss when player HP reaches zero', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);
    const battleState = startRound({
      ...state,
      player: {
        ...state.player,
        hp: 2,
      },
    }).state;

    const result = endRound(battleState, 2, 0);

    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(OPPONENT_RACE);
    expect(result.state.player.hp).toBe(0);
    expect(result.state.opponent.hp).toBeGreaterThan(0);
  });

  it('ends the match with opponent loss when opponent HP reaches zero', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);
    const battleState = startRound({
      ...state,
      opponent: {
        ...state.opponent,
        hp: 3,
      },
    }).state;

    const result = endRound(battleState, 0, 3);

    expect(result.isMatchOver).toBe(true);
    expect(result.winner).toBe(PLAYER_RACE);
    expect(result.state.player.hp).toBeGreaterThan(0);
    expect(result.state.opponent.hp).toBe(0);
  });

  it('does not produce a premature outcome while both duelists keep HP', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);
    const battleState = startRound({
      ...state,
      player: {
        ...state.player,
        hp: 5,
      },
      opponent: {
        ...state.opponent,
        hp: 5,
      },
    }).state;

    const result = endRound(battleState, 2, 1);

    expect(result.isMatchOver).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.state.player.hp).toBe(3);
    expect(result.state.opponent.hp).toBe(4);
    expect(result.state.phase).toBe('build');
  });
});
