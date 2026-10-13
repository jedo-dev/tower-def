import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { Difficulty } from '../../difficulty/model/types';
import { getSendCostByTier, getIncomeBonusByTier } from '../../duel-match/model/sendEconomy';
import { getSendCapPerWave, getUnitTypeSendCapByTier } from '../../duel-match/model/sendLimits';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type { UnitId } from '../../unit/model/types';
import type { DecisionContext } from './types';
import { StrategyIntent } from './types';
import { createComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
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

  describe('economy and pressure balance', () => {
    function tiersOf(result: ReturnType<typeof planSendCreeps>): number[] {
      return result.actions.map(
        (action) => resolveUnitConfigById(action.creepTypeId as never).tier,
      );
    }

    /**
     * Tier 1 is the income buy: cheapest payback per gold, weakest body. How
     * many of them a plan contains is the readable signal of where the round's
     * budget went, which the raw income total is not: a tougher creep still
     * grants income, so a pressure-heavy plan can out-earn an economy one.
     */
    function economyBuyCount(result: ReturnType<typeof planSendCreeps>): number {
      return tiersOf(result).filter((tier) => tier === 1).length;
    }

    it('spends the opening rounds on the best income per gold', () => {
      const result = planSendCreeps({ context: createTestContext({ gold: 1000, round: 1 }) });

      // Tier 1 pays back fastest, so an opening buy is nothing but tier 1.
      expect(tiersOf(result)).toEqual(tiersOf(result).map(() => 1));
      expect(result.totalIncomeBonus).toBeGreaterThan(0);
    });

    it('shifts towards tougher creeps once the opening is over', () => {
      const opening = planSendCreeps({ context: createTestContext({ gold: 1000, round: 1 }) });
      const late = planSendCreeps({ context: createTestContext({ gold: 1000, round: 15 }) });

      expect(Math.max(...tiersOf(late))).toBeGreaterThan(Math.max(...tiersOf(opening)));
    });

    it('buys more income per gold than a naive most-expensive-first plan would', () => {
      const result = planSendCreeps({ context: createTestContext({ gold: 1000, round: 1 }) });

      const incomePerGold = result.totalIncomeBonus / result.totalCost;
      const worstTier = Math.max(
        ...getRaceRegistry(RaceId.UNDEAD).sendableCreepIds.map(
          (id) => resolveUnitConfigById(id).tier,
        ),
      );
      const naiveIncomePerGold =
        getIncomeBonusByTier(worstTier as never) / getSendCostByTier(worstTier as never);

      expect(incomePerGold).toBeGreaterThan(naiveIncomePerGold);
    });

    it('goes all in on pressure when its own life total is nearly gone', () => {
      const healthy = planSendCreeps({
        context: createTestContext({ gold: 1000, round: 8, hp: 20 }),
      });
      const desperate = planSendCreeps({
        context: createTestContext({ gold: 1000, round: 8, hp: 2 }),
      });

      expect(economyBuyCount(desperate)).toBeLessThan(economyBuyCount(healthy));
    });

    it('leans harder on pressure while ahead on income than while behind', () => {
      const ahead = planSendCreeps({
        context: createTestContext({
          gold: 1000,
          round: 10,
          income: 120,
          enemy: { hp: 20, income: 50, towerCount: 5 },
        }),
      });
      const behind = planSendCreeps({
        context: createTestContext({
          gold: 1000,
          round: 10,
          income: 50,
          enemy: { hp: 20, income: 120, towerCount: 5 },
        }),
      });

      expect(economyBuyCount(ahead)).toBeLessThan(economyBuyCount(behind));
    });

    it('caps how many creeps one round can send', () => {
      const result = planSendCreeps({
        context: createTestContext({ gold: 100000, difficulty: Difficulty.NORMAL, round: 1 }),
      });

      expect(result.actions.length).toBeLessThanOrEqual(5);
    });

    it('sends more on a harder difficulty than on an easier one', () => {
      const easy = planSendCreeps({
        context: createTestContext({ gold: 1000, difficulty: Difficulty.EASY, round: 8 }),
      });
      const nightmare = planSendCreeps({
        context: createTestContext({ gold: 1000, difficulty: Difficulty.NIGHTMARE, round: 8 }),
      });

      expect(nightmare.actions.length).toBeGreaterThan(easy.actions.length);
      expect(nightmare.totalCost).toBeGreaterThan(easy.totalCost);
    });

    it('never spends more than the round budget', () => {
      for (const difficulty of [
        Difficulty.EASY,
        Difficulty.NORMAL,
        Difficulty.HARD,
        Difficulty.NIGHTMARE,
      ]) {
        for (const round of [1, 6, 14]) {
          const gold = 900;
          const result = planSendCreeps({
            context: createTestContext({ gold, difficulty, round }),
          });

          expect(result.totalCost).toBeLessThanOrEqual(gold);
        }
      }
    });

    it('works without knowing anything about the enemy', () => {
      const context = createTestContext({ gold: 1000, round: 10 });
      delete (context as { enemy?: unknown }).enemy;

      const result = planSendCreeps({ context });

      expect(result.actions.length).toBeGreaterThan(0);
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

  describe('debug snapshots', () => {
    it('records optional send decision snapshot when recorder is provided', () => {
      const context = createTestContext({
        gold: 1000,
        intent: StrategyIntent.PRESSURE,
      });
      const debugRecorder = createComputerDecisionDebugRecorder(1);

      planSendCreeps({ context, debugRecorder });

      const snapshots = debugRecorder.getSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].kind).toBe('send');
      expect(snapshots[0].intent).toBe(StrategyIntent.PRESSURE);
      expect(snapshots[0].goldBefore).toBe(1000);
      expect(snapshots[0].actionSummary).toContain('send');
    });
  });
});

describe('entities/computer-opponent/planSendCreeps shared send limits', () => {
  function countById(ids: readonly UnitId[]): Map<UnitId, number> {
    const counts = new Map<UnitId, number>();
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  for (const difficulty of Object.values(Difficulty)) {
    it(`never plans past the shared caps on ${difficulty}`, () => {
      const result = planSendCreeps({
        context: createTestContext({ difficulty, gold: 1_000_000, round: 20 }),
      });
      const ids = result.actions.map((action) => action.creepTypeId);

      expect(ids.length).toBeLessThanOrEqual(getSendCapPerWave());
      for (const [id, count] of countById(ids)) {
        const tier = resolveUnitConfigById(id).tier;
        expect(count).toBeLessThanOrEqual(getUnitTypeSendCapByTier(tier));
      }
    });
  }

  it('counts creeps already queued this wave against the caps', () => {
    const queued: UnitId[] = Array.from(
      { length: getSendCapPerWave() - 1 },
      (): UnitId => 'undead_skeleton',
    );
    const result = planSendCreeps({
      context: createTestContext({
        difficulty: Difficulty.NIGHTMARE,
        gold: 1_000_000,
        round: 20,
        queuedSends: queued,
      }),
    });

    expect(result.actions.length).toBeLessThanOrEqual(1);
    expect(result.actions.map((action) => action.creepTypeId)).not.toContain('undead_skeleton');
  });
});
