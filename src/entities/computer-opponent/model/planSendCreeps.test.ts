import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { getSendCostByTier, getIncomeBonusByTier } from '../../duel-match/model/sendEconomy';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type { DecisionContext } from './types';
import { planSendCreeps } from './planSendCreeps';

function createTestContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 500,
    income: 50,
    hp: 20,
    raceId: RaceId.UNDEAD,
    difficulty: Difficulty.NORMAL,
    round: 3,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: 150,
      occupiedCells: 20,
      towerCount: 5,
    },
    threat: {
      incomingCreepCount: 0,
      estimatedLeakCount: 0,
      threatLevel: 'low',
    },
    leakHistory: [],
    affordableTowers: [],
    upgradeableTowerIds: [],
    availableBuildPositions: [],
    ...overrides,
  };
}

describe('entities/computer-opponent/planSendCreeps', () => {
  describe('phase gating', () => {
    it('returns empty actions when not in build phase', () => {
      const context = createTestContext({ phase: 'battle' });

      const result = planSendCreeps({ context });

      expect(result.actions).toHaveLength(0);
      expect(result.totalCost).toBe(0);
      expect(result.reasoning).toContain('Not in build phase');
    });
  });

  describe('threat gating', () => {
    it('returns empty actions when threat is high', () => {
      const context = createTestContext({
        threat: {
          incomingCreepCount: 15,
          estimatedLeakCount: 3,
          threatLevel: 'high',
        },
      });

      const result = planSendCreeps({ context });

      expect(result.actions).toHaveLength(0);
      expect(result.reasoning).toContain('High threat');
    });

    it('sends creeps when threat is low', () => {
      const context = createTestContext({
        gold: 1000,
        threat: {
          incomingCreepCount: 0,
          estimatedLeakCount: 0,
          threatLevel: 'low',
        },
      });

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
    });
  });

  describe('budget constraints', () => {
    it('returns empty when gold is zero', () => {
      const context = createTestContext({ gold: 0 });

      const result = planSendCreeps({ context });

      expect(result.actions).toHaveLength(0);
      expect(result.reasoning).toContain('No budget');
    });

    it('respects difficulty-based send budget', () => {
      const easyContext = createTestContext({
        gold: 200,
        difficulty: Difficulty.EASY,
      });

      const hardContext = createTestContext({
        gold: 200,
        difficulty: Difficulty.HARD,
      });

      const easyResult = planSendCreeps({ context: easyContext });
      const hardResult = planSendCreeps({ context: hardContext });

      expect(hardResult.totalCost).toBeGreaterThanOrEqual(easyResult.totalCost);
    });
  });

  describe('creep selection', () => {
    it('selects creeps for undead race', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.UNDEAD,
      });

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
      for (const action of result.actions) {
        expect(action.kind).toBe('send_creep');
        expect(action.creepTypeId).toBeDefined();
      }
    });

    it('selects creeps for orc race', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.ORC,
      });

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('selects creeps for human race', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.HUMAN,
      });

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('selects creeps for elf race', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.ELF,
      });

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('calculates total cost correctly', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.UNDEAD,
      });

      const result = planSendCreeps({ context });

      let expectedCost = 0;
      for (const action of result.actions) {
        if (action.kind === 'send_creep') {
          const unitConfig = resolveUnitConfigById(action.creepTypeId as never);
          if (unitConfig) {
            expectedCost += getSendCostByTier(unitConfig.tier);
          }
        }
      }

      expect(result.totalCost).toBe(expectedCost);
    });

    it('calculates total income bonus correctly', () => {
      const context = createTestContext({
        gold: 1000,
        raceId: RaceId.UNDEAD,
      });

      const result = planSendCreeps({ context });

      let expectedBonus = 0;
      for (const action of result.actions) {
        if (action.kind === 'send_creep') {
          const unitConfig = resolveUnitConfigById(action.creepTypeId as never);
          if (unitConfig) {
            expectedBonus += getIncomeBonusByTier(unitConfig.tier);
          }
        }
      }

      expect(result.totalIncomeBonus).toBe(expectedBonus);
    });
  });

  describe('determinism', () => {
    it('returns identical output for identical input', () => {
      const context = createTestContext({
        gold: 500,
        raceId: RaceId.UNDEAD,
        difficulty: Difficulty.NORMAL,
      });

      const input = { context };

      const result1 = planSendCreeps(input);
      const result2 = planSendCreeps(input);

      expect(result1).toEqual(result2);
    });
  });
});
