import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { DUEL_MATCH_BALANCE } from './balance';
import {
  canAffordSendCreep,
  clearSendQueue,
  endRound,
  generateBaselineWaveId,
  payIncome,
  sendCreep,
  startRound,
} from './lifecycle';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

const PLAYER_RACE = RaceId.UNDEAD;
const OPPONENT_RACE = RaceId.ORC;

function createTestState(overrides?: Partial<DuelMatchState>): DuelMatchState {
  return {
    ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE),
    ...overrides,
  };
}

describe('entities/duel-match', () => {
  describe('generateBaselineWaveId', () => {
    it('generates a deterministic wave id from round number', () => {
      expect(generateBaselineWaveId(1)).toBe('baseline_wave_round_1');
      expect(generateBaselineWaveId(5)).toBe('baseline_wave_round_5');
    });
  });

  describe('startRound', () => {
    it('increments round number', () => {
      const state = createTestState({ round: 0 });
      const result = startRound(state);
      expect(result.state.round).toBe(1);
    });

    it('sets phase to battle', () => {
      const state = createTestState({ phase: 'build' });
      const result = startRound(state);
      expect(result.state.phase).toBe('battle');
    });

    it('generates baseline wave id for the new round', () => {
      const state = createTestState({ round: 3 });
      const result = startRound(state);
      expect(result.baselineWaveId).toBe('baseline_wave_round_4');
      expect(result.state.baselineWaveId).toBe('baseline_wave_round_4');
    });

    it('preserves player and opponent state', () => {
      const state = createTestState();
      const result = startRound(state);
      expect(result.state.player).toEqual(state.player);
      expect(result.state.opponent).toEqual(state.opponent);
    });
  });

  describe('payIncome', () => {
    it('adds income to player gold', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: 100,
          income: 50,
        },
      });
      const result = payIncome(state);
      expect(result.state.player.gold).toBe(150);
      expect(result.playerIncomePaid).toBe(50);
    });

    it('adds income to opponent gold', () => {
      const state = createTestState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 200,
          income: 30,
        },
      });
      const result = payIncome(state);
      expect(result.state.opponent.gold).toBe(230);
      expect(result.opponentIncomePaid).toBe(30);
    });

    it('returns correct income amounts', () => {
      const state = createTestState();
      const result = payIncome(state);
      expect(result.playerIncomePaid).toBe(DUEL_MATCH_BALANCE.startingIncome);
      expect(result.opponentIncomePaid).toBe(DUEL_MATCH_BALANCE.startingIncome);
    });
  });

  describe('endRound', () => {
    it('sets phase to build', () => {
      const state = createTestState({ phase: 'battle' });
      const result = endRound(state, 0, 0);
      expect(result.state.phase).toBe('build');
    });

    it('reduces player HP for leaked creeps', () => {
      const state = createTestState();
      const result = endRound(state, 3, 0);
      expect(result.state.player.hp).toBe(
        DUEL_MATCH_BALANCE.startingHp - 3 * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep,
      );
      expect(result.playerHpLost).toBe(3 * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep);
    });

    it('reduces opponent HP for leaked creeps', () => {
      const state = createTestState();
      const result = endRound(state, 0, 5);
      expect(result.state.opponent.hp).toBe(
        DUEL_MATCH_BALANCE.startingHp - 5 * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep,
      );
      expect(result.opponentHpLost).toBe(5 * DUEL_MATCH_BALANCE.hpLossPerLeakedCreep);
    });

    it('HP does not go below zero', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          hp: 2,
        },
      });
      const result = endRound(state, 10, 0);
      expect(result.state.player.hp).toBe(0);
    });

    it('detects match over when player HP reaches zero', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          hp: 1,
        },
      });
      const result = endRound(state, 1, 0);
      expect(result.isMatchOver).toBe(true);
      expect(result.winner).toBe(OPPONENT_RACE);
    });

    it('detects match over when opponent HP reaches zero', () => {
      const state = createTestState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          hp: 1,
        },
      });
      const result = endRound(state, 0, 1);
      expect(result.isMatchOver).toBe(true);
      expect(result.winner).toBe(PLAYER_RACE);
    });

    it('declares no winner when both HP reach zero', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          hp: 1,
        },
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          hp: 1,
        },
      });
      const result = endRound(state, 1, 1);
      expect(result.isMatchOver).toBe(true);
      expect(result.winner).toBeNull();
    });

    it('match continues when both HP remain positive', () => {
      const state = createTestState();
      const result = endRound(state, 1, 1);
      expect(result.isMatchOver).toBe(false);
      expect(result.winner).toBeNull();
    });
  });

  describe('sendCreep', () => {
    it('deducts gold and adds creep to player send queue', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: 200,
        },
      });
      const result = sendCreep(state, true, 'undead_skeleton');
      expect(result.sent).toBe(true);
      expect(result.cost).toBe(DUEL_MATCH_BALANCE.sendCreepBaseCost);
      expect(result.state.player.gold).toBe(200 - DUEL_MATCH_BALANCE.sendCreepBaseCost);
      expect(result.state.player.sendQueue).toContain('undead_skeleton');
    });

    it('increases player income after sending creep', () => {
      const state = createTestState();
      const result = sendCreep(state, true, 'undead_skeleton');
      expect(result.state.player.income).toBe(
        state.player.income + DUEL_MATCH_BALANCE.sendCreepIncomeBonus,
      );
    });

    it('deducts gold and adds creep to opponent send queue', () => {
      const state = createTestState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 200,
        },
      });
      const result = sendCreep(state, false, 'orc_grunt');
      expect(result.sent).toBe(true);
      expect(result.state.opponent.gold).toBe(200 - DUEL_MATCH_BALANCE.sendCreepBaseCost);
      expect(result.state.opponent.sendQueue).toContain('orc_grunt');
    });

    it('fails when player cannot afford', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: 10,
        },
      });
      const result = sendCreep(state, true, 'undead_skeleton');
      expect(result.sent).toBe(false);
      expect(result.state).toBe(state);
    });

    it('preserves existing send queue entries', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: 500,
          sendQueue: ['undead_ghoul'],
        },
      });
      const result = sendCreep(state, true, 'undead_skeleton');
      expect(result.state.player.sendQueue).toEqual(['undead_ghoul', 'undead_skeleton']);
    });
  });

  describe('canAffordSendCreep', () => {
    it('returns true when player has enough gold', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: DUEL_MATCH_BALANCE.sendCreepBaseCost,
        },
      });
      expect(canAffordSendCreep(state, true)).toBe(true);
    });

    it('returns false when player lacks gold', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          gold: DUEL_MATCH_BALANCE.sendCreepBaseCost - 1,
        },
      });
      expect(canAffordSendCreep(state, true)).toBe(false);
    });

    it('returns true when opponent has enough gold', () => {
      const state = createTestState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: DUEL_MATCH_BALANCE.sendCreepBaseCost,
        },
      });
      expect(canAffordSendCreep(state, false)).toBe(true);
    });
  });

  describe('clearSendQueue', () => {
    it('empties player send queue', () => {
      const state = createTestState({
        player: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).player,
          sendQueue: ['undead_skeleton', 'undead_ghoul'],
        },
      });
      const result = clearSendQueue(state);
      expect(result.player.sendQueue).toEqual([]);
    });

    it('empties opponent send queue', () => {
      const state = createTestState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          sendQueue: ['orc_grunt'],
        },
      });
      const result = clearSendQueue(state);
      expect(result.opponent.sendQueue).toEqual([]);
    });

    it('preserves other state fields', () => {
      const state = createTestState({ round: 5 });
      const result = clearSendQueue(state);
      expect(result.round).toBe(5);
    });
  });
});
