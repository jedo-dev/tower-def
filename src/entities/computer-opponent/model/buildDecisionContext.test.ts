import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState } from '../../duel-match/model/state';
import { addTower } from '../../duel-match/model/battlefieldOps';
import type { DuelMatchState } from '../../duel-match/model/types';
import { buildDecisionContext } from './buildDecisionContext';
import type { LeakHistoryEntry } from './types';

const PLAYER_RACE = RaceId.UNDEAD;
const OPPONENT_RACE = RaceId.ORC;

function createTestMatchState(overrides?: Partial<DuelMatchState>): DuelMatchState {
  return {
    ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE),
    ...overrides,
  };
}

function createTestTower(overrides?: { id?: string; x?: number; y?: number; type?: 'single' | 'splash'; level?: number }) {
  return {
    id: overrides?.id ?? 'tower_1',
    position: { x: overrides?.x ?? 2, y: overrides?.y ?? 3 },
    cost: 50,
    type: (overrides?.type ?? 'single') as 'single' | 'splash',
    level: overrides?.level ?? 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

describe('entities/computer-opponent/buildDecisionContext', () => {
  describe('snapshot shape', () => {
    it('returns all required fields', () => {
      const matchState = createTestMatchState();
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context).toHaveProperty('gold');
      expect(context).toHaveProperty('income');
      expect(context).toHaveProperty('hp');
      expect(context).toHaveProperty('raceId');
      expect(context).toHaveProperty('difficulty');
      expect(context).toHaveProperty('round');
      expect(context).toHaveProperty('phase');
      expect(context).toHaveProperty('mazeCoverage');
      expect(context).toHaveProperty('threat');
      expect(context).toHaveProperty('leakHistory');
      expect(context).toHaveProperty('affordableTowers');
      expect(context).toHaveProperty('upgradeableTowerIds');
      expect(context).toHaveProperty('availableBuildPositions');
    });

    it('derives values from opponent state', () => {
      const matchState = createTestMatchState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 500,
          income: 25,
          hp: 15,
          raceId: RaceId.HUMAN,
        },
      });

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.HARD,
        leakHistory: [],
      });

      expect(context.gold).toBe(500);
      expect(context.income).toBe(25);
      expect(context.hp).toBe(15);
      expect(context.raceId).toBe(RaceId.HUMAN);
    });

    it('uses provided difficulty', () => {
      const matchState = createTestMatchState();

      for (const difficulty of [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD, Difficulty.NIGHTMARE]) {
        const context = buildDecisionContext({
          matchState,
          difficulty,
          leakHistory: [],
        });
        expect(context.difficulty).toBe(difficulty);
      }
    });

    it('uses match round and phase', () => {
      const matchState = createTestMatchState({ round: 5, phase: 'battle' });
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.round).toBe(5);
      expect(context.phase).toBe('battle');
    });

    it('preserves leak history', () => {
      const matchState = createTestMatchState();
      const leakHistory: LeakHistoryEntry[] = [
        { round: 1, leakedCount: 2 },
        { round: 3, leakedCount: 5 },
      ];

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory,
      });

      expect(context.leakHistory).toEqual(leakHistory);
    });
  });

  describe('mazeCoverage', () => {
    it('computes tower count from battlefield', () => {
      let matchState = createTestMatchState();
      const tower1 = createTestTower({ id: 't1', x: 1, y: 1 });
      const tower2 = createTestTower({ id: 't2', x: 2, y: 2 });

      const updatedBattlefield = addTower(
        addTower(matchState.opponent.battlefield, tower1),
        tower2,
      );

      matchState = {
        ...matchState,
        opponent: { ...matchState.opponent, battlefield: updatedBattlefield },
      };

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.mazeCoverage.towerCount).toBe(2);
    });

    it('computes occupied cells from grid', () => {
      let matchState = createTestMatchState();
      const tower = createTestTower({ x: 3, y: 5 });

      matchState = {
        ...matchState,
        opponent: {
          ...matchState.opponent,
          battlefield: addTower(matchState.opponent.battlefield, tower),
        },
      };

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.mazeCoverage.occupiedCells).toBe(1);
    });

    it('totalWalkableCells is positive for initial grid', () => {
      const matchState = createTestMatchState();
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.mazeCoverage.totalWalkableCells).toBeGreaterThan(0);
    });
  });

  describe('threat', () => {
    it('assesses low threat for empty battlefield', () => {
      const matchState = createTestMatchState();
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.threat.incomingCreepCount).toBe(0);
      expect(context.threat.estimatedLeakCount).toBe(0);
      expect(context.threat.threatLevel).toBe('low');
    });
  });

  describe('affordableTowers', () => {
    it('returns empty array when gold is zero', () => {
      const matchState = createTestMatchState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 0,
        },
      });

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.affordableTowers).toEqual([]);
    });

    it('returns tower types affordable for race', () => {
      const matchState = createTestMatchState({
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 1000,
          raceId: RaceId.UNDEAD,
        },
      });

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.affordableTowers.length).toBeGreaterThan(0);
      expect(context.affordableTowers).toContain('single');
    });
  });

  describe('upgradeableTowerIds', () => {
    it('returns empty when no towers exist', () => {
      const matchState = createTestMatchState();
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.upgradeableTowerIds).toEqual([]);
    });

    it('returns tower ids that can be upgraded', () => {
      let matchState = createTestMatchState();
      const tower = createTestTower({ id: 'upgradeable_1', level: 1 });

      matchState = {
        ...matchState,
        opponent: {
          ...matchState.opponent,
          gold: 1000,
          battlefield: addTower(matchState.opponent.battlefield, tower),
        },
      };

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.upgradeableTowerIds).toContain('upgradeable_1');
    });

    it('excludes max-level towers', () => {
      let matchState = createTestMatchState();
      const tower = createTestTower({ id: 'max_level', level: 3 });

      matchState = {
        ...matchState,
        opponent: {
          ...matchState.opponent,
          gold: 1000,
          battlefield: addTower(matchState.opponent.battlefield, tower),
        },
      };

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.upgradeableTowerIds).not.toContain('max_level');
    });
  });

  describe('availableBuildPositions', () => {
    it('returns positions for empty cells on initial grid', () => {
      const matchState = createTestMatchState();
      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      expect(context.availableBuildPositions.length).toBeGreaterThan(0);
    });

    it('excludes occupied cells', () => {
      let matchState = createTestMatchState();
      const tower = createTestTower({ x: 3, y: 5 });

      matchState = {
        ...matchState,
        opponent: {
          ...matchState.opponent,
          battlefield: addTower(matchState.opponent.battlefield, tower),
        },
      };

      const context = buildDecisionContext({
        matchState,
        difficulty: Difficulty.NORMAL,
        leakHistory: [],
      });

      const occupiedPosition = context.availableBuildPositions.find(
        (pos) => pos.x === 3 && pos.y === 5,
      );
      expect(occupiedPosition).toBeUndefined();
    });
  });

  describe('determinism', () => {
    it('returns identical snapshot for identical input', () => {
      const matchState = createTestMatchState({
        round: 3,
        phase: 'build',
        opponent: {
          ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
          gold: 250,
          income: 15,
          hp: 18,
        },
      });

      const leakHistory: LeakHistoryEntry[] = [{ round: 1, leakedCount: 2 }];

      const input = { matchState, difficulty: Difficulty.NORMAL, leakHistory };

      const context1 = buildDecisionContext(input);
      const context2 = buildDecisionContext(input);

      expect(context1).toEqual(context2);
    });
  });
});
