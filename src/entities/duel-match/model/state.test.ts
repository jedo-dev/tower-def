import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from './state';

const PLAYER_RACE = RaceId.UNDEAD;
const OPPONENT_RACE = RaceId.ORC;

describe('entities/duel-match/createInitialDuelMatchState', () => {
  it('opens the player on the player purse', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);

    expect(state.player.gold).toBe(DUEL_MATCH_BALANCE.startingGold);
  });

  it('opens the opponent on the same purse as the player', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);

    expect(state.opponent.gold).toBe(DUEL_MATCH_BALANCE.startingGold);
    expect(state.opponent.gold).toBe(state.player.gold);
  });

  it('keeps every other opening value equal on both sides', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);

    expect(state.opponent.hp).toBe(state.player.hp);
    expect(state.opponent.income).toBe(state.player.income);
    expect(state.opponent.sendQueue).toEqual(state.player.sendQueue);
  });

  it('gives each side its own battlefield', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);

    expect(state.player.battlefield).not.toBe(state.opponent.battlefield);
    expect(state.player.battlefield.grid.entrance).toEqual(DEFAULT_ENTRANCE);
    expect(state.opponent.battlefield.grid.exit).toEqual(DEFAULT_EXIT);
  });

  it('honours custom entrance and exit positions', () => {
    const entrance = { x: 3, y: 0 };
    const exit = { x: 6, y: 14 };

    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE, { entrance, exit });

    expect(state.player.battlefield.grid.entrance).toEqual(entrance);
    expect(state.opponent.battlefield.grid.entrance).toEqual(entrance);
    expect(state.opponent.battlefield.grid.exit).toEqual(exit);
  });

  it('starts before the first round, in the build phase', () => {
    const state = createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE);

    expect(state.round).toBe(0);
    expect(state.phase).toBe('build');
    expect(state.player.raceId).toBe(PLAYER_RACE);
    expect(state.opponent.raceId).toBe(OPPONENT_RACE);
  });
});
