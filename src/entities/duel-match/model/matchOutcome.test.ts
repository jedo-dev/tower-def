import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { endRound, settleRound, startRound } from './lifecycle';
import { resolveDuelMatchOutcome, type DuelWaveOutcomeFacts } from './matchOutcome';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

function facts(overrides: Partial<DuelWaveOutcomeFacts>): DuelWaveOutcomeFacts {
  return {
    playerHpBefore: 5,
    opponentHpBefore: 5,
    playerHpAfter: 0,
    opponentHpAfter: 0,
    playerLeakedCreeps: 5,
    opponentLeakedCreeps: 5,
    ...overrides,
  };
}

function battleStateWithLives(playerHp: number, opponentHp: number): DuelMatchState {
  const state = createInitialDuelMatchState(RaceId.HUMAN, RaceId.ORC);
  return startRound({
    ...state,
    player: { ...state.player, hp: playerHp },
    opponent: { ...state.opponent, hp: opponentHp },
  }).state;
}

describe('entities/duel-match/matchOutcome', () => {
  describe('resolveDuelMatchOutcome', () => {
    it('has no outcome while both sides keep lives', () => {
      expect(resolveDuelMatchOutcome(facts({ playerHpAfter: 1, opponentHpAfter: 2 }))).toEqual({
        winningSide: null,
        reason: null,
      });
    });

    it('gives a knockout to the side still standing', () => {
      expect(resolveDuelMatchOutcome(facts({ playerHpAfter: 3 }))).toEqual({
        winningSide: 'player',
        reason: 'knockout',
      });
      expect(resolveDuelMatchOutcome(facts({ opponentHpAfter: 3 }))).toEqual({
        winningSide: 'opponent',
        reason: 'knockout',
      });
    });

    it('lets the side that leaked fewer creeps win when both fall', () => {
      expect(
        resolveDuelMatchOutcome(facts({ playerLeakedCreeps: 6, opponentLeakedCreeps: 9 })),
      ).toEqual({ winningSide: 'player', reason: 'fewer_leaks' });
      expect(
        resolveDuelMatchOutcome(facts({ playerLeakedCreeps: 9, opponentLeakedCreeps: 6 })),
      ).toEqual({ winningSide: 'opponent', reason: 'fewer_leaks' });
    });

    it('prefers fewer leaks over more lives before the wave', () => {
      expect(
        resolveDuelMatchOutcome(
          facts({
            playerHpBefore: 2,
            opponentHpBefore: 8,
            playerLeakedCreeps: 3,
            opponentLeakedCreeps: 10,
          }),
        ),
      ).toEqual({ winningSide: 'player', reason: 'fewer_leaks' });
    });

    it('falls back to more lives before the wave on equal leaks', () => {
      expect(resolveDuelMatchOutcome(facts({ playerHpBefore: 7, opponentHpBefore: 4 }))).toEqual({
        winningSide: 'player',
        reason: 'more_lives_before_wave',
      });
      expect(resolveDuelMatchOutcome(facts({ playerHpBefore: 4, opponentHpBefore: 7 }))).toEqual({
        winningSide: 'opponent',
        reason: 'more_lives_before_wave',
      });
    });

    it('is a draw only when leaks and lives before the wave are both equal', () => {
      expect(resolveDuelMatchOutcome(facts({}))).toEqual({ winningSide: null, reason: 'draw' });
    });
  });

  describe('endRound tie-break', () => {
    it('awards the match to the side that leaked fewer when both hit 0', () => {
      const result = endRound(battleStateWithLives(3, 3), 3, 5);

      expect(result.state.player.hp).toBe(0);
      expect(result.state.opponent.hp).toBe(0);
      expect(result.isMatchOver).toBe(true);
      expect(result.winningSide).toBe('player');
      expect(result.winner).toBe(RaceId.HUMAN);
      expect(result.endReason).toBe('fewer_leaks');
    });

    it('awards the match to the side with more lives before the wave on equal leaks', () => {
      const result = endRound(battleStateWithLives(2, 4), 4, 4);

      expect(result.winningSide).toBe('opponent');
      expect(result.winner).toBe(RaceId.ORC);
      expect(result.endReason).toBe('more_lives_before_wave');
    });

    it('declares a draw when leaks and lives before the wave match', () => {
      const result = endRound(battleStateWithLives(3, 3), 4, 4);

      expect(result.isMatchOver).toBe(true);
      expect(result.winningSide).toBeNull();
      expect(result.winner).toBeNull();
      expect(result.endReason).toBe('draw');
    });

    it('names the winning side even in a mirror match', () => {
      const state = createInitialDuelMatchState(RaceId.ORC, RaceId.ORC);
      const battleState = startRound({ ...state, opponent: { ...state.opponent, hp: 1 } }).state;

      const result = endRound(battleState, 0, 1);

      expect(result.winningSide).toBe('player');
      expect(result.endReason).toBe('knockout');
    });

    it('settles the tie-break without paying income', () => {
      const result = settleRound(battleStateWithLives(3, 3), 5, 3);

      expect(result.winningSide).toBe('opponent');
      expect(result.endReason).toBe('fewer_leaks');
      expect(result.playerIncomePaid).toBe(0);
      expect(result.opponentIncomePaid).toBe(0);
    });

    it('reports no outcome while the match goes on', () => {
      const result = endRound(battleStateWithLives(10, 10), 1, 2);

      expect(result.isMatchOver).toBe(false);
      expect(result.winningSide).toBeNull();
      expect(result.endReason).toBeNull();
    });
  });
});
