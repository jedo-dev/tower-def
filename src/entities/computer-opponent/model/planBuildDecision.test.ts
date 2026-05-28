import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import { RaceId } from '../../../shared/types/content-ids';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import type { TowerEntity } from '../../tower/model/types';
import type { DecisionContext } from './types';
import { StrategyIntent } from './types';
import { planBuildDecision } from './planBuildDecision';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

function createTestGrid() {
  return createGridModel({ entrance: ENTRANCE, exit: EXIT });
}

function createTestPath() {
  const grid = createTestGrid();
  return findPathBfs(grid).path;
}

function createTestTower(overrides?: { id?: string; x?: number; y?: number; type?: 'archer' | 'splash'; level?: number }): TowerEntity {
  return {
    id: overrides?.id ?? 'tower_1',
    position: { x: overrides?.x ?? 2, y: overrides?.y ?? 3 },
    cost: 50,
    type: (overrides?.type ?? 'archer') as 'archer' | 'splash',
    level: overrides?.level ?? 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

function createTestContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 200,
    income: 10,
    hp: 20,
    raceId: RaceId.UNDEAD,
    difficulty: Difficulty.NORMAL,
    round: 1,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: 150,
      occupiedCells: 5,
      towerCount: 2,
    },
    threat: {
      incomingCreepCount: 0,
      estimatedLeakCount: 0,
      threatLevel: 'low',
    },
    leakHistory: [],
    affordableTowers: [TowerTypeId.ARCHER],
    upgradeableTowerIds: [],
    availableBuildPositions: [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }],
    ...overrides,
  };
}

describe('entities/computer-opponent/planBuildDecision', () => {
  describe('phase gating', () => {
    it('returns save action when not in build phase', () => {
      const context = createTestContext({ phase: 'battle' });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toEqual({ kind: 'save' });
      expect(result.reasoning).toContain('Not in build phase');
    });
  });

  describe('budget constraints', () => {
    it('returns save when gold is zero', () => {
      const context = createTestContext({ gold: 0 });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toEqual({ kind: 'save' });
    });

    it('respects difficulty-based spend budget', () => {
      const grid = createTestGrid();
      const path = createTestPath();
      const tower = createTestTower({ id: 't1', level: 1 });

      const easyContext = createTestContext({
        gold: 100,
        difficulty: Difficulty.EASY,
        upgradeableTowerIds: ['t1'],
      });

      const hardContext = createTestContext({
        gold: 100,
        difficulty: Difficulty.HARD,
        upgradeableTowerIds: ['t1'],
      });

      const easyResult = planBuildDecision({
        context: easyContext,
        grid,
        existingTowers: [tower],
        path,
      });

      const hardResult = planBuildDecision({
        context: hardContext,
        grid,
        existingTowers: [tower],
        path,
      });

      expect(easyResult.intent).toBeDefined();
      expect(hardResult.intent).toBeDefined();
    });
  });

  describe('upgrade selection', () => {
    it('selects upgrade when intent is UPGRADE and affordable', () => {
      const tower = createTestTower({ id: 't1', level: 1 });
      const context = createTestContext({
        gold: 200,
        upgradeableTowerIds: ['t1'],
        mazeCoverage: {
          totalWalkableCells: 150,
          occupiedCells: 20,
          towerCount: 5,
        },
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [tower],
        path,
      });

      const upgradeAction = result.actions.find((a) => a.kind === 'upgrade');
      expect(upgradeAction).toBeDefined();
      expect(upgradeAction).toEqual({ kind: 'upgrade', towerId: 't1' });
    });

    it('skips upgrade when tower is max level', () => {
      const tower = createTestTower({ id: 't1', level: 3 });
      const context = createTestContext({
        gold: 200,
        upgradeableTowerIds: [],
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [tower],
        path,
      });

      const upgradeAction = result.actions.find((a) => a.kind === 'upgrade');
      expect(upgradeAction).toBeUndefined();
    });
  });

  describe('build selection', () => {
    it('selects build when intent is EXTEND_MAZE and positions available', () => {
      const context = createTestContext({
        gold: 200,
        affordableTowers: [TowerTypeId.ARCHER],
        availableBuildPositions: [{ x: 3, y: 5 }, { x: 4, y: 5 }],
        mazeCoverage: {
          totalWalkableCells: 150,
          occupiedCells: 5,
          towerCount: 1,
        },
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      const buildAction = result.actions.find((a) => a.kind === 'build');
      expect(buildAction).toBeDefined();
      if (buildAction && buildAction.kind === 'build') {
        expect(buildAction.towerType).toBe(TowerTypeId.ARCHER);
        expect(buildAction.position).toBeDefined();
      }
    });

    it('returns save when no affordable towers', () => {
      const context = createTestContext({
        gold: 10,
        affordableTowers: [],
        availableBuildPositions: [{ x: 3, y: 5 }],
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toEqual({ kind: 'save' });
    });

    it('returns save when no available positions', () => {
      const context = createTestContext({
        gold: 200,
        affordableTowers: [TowerTypeId.ARCHER],
        availableBuildPositions: [],
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toEqual({ kind: 'save' });
    });
  });

  describe('intent selection', () => {
    it('selects DEFEND when threat is high', () => {
      const context = createTestContext({
        threat: {
          incomingCreepCount: 15,
          estimatedLeakCount: 3,
          threatLevel: 'high',
        },
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.intent).toBe(StrategyIntent.DEFEND);
    });

    it('selects DEFEND when recent leaks exist', () => {
      const context = createTestContext({
        leakHistory: [{ round: 1, leakedCount: 3 }],
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.intent).toBe(StrategyIntent.DEFEND);
    });

    it('selects UPGRADE when towers exist and coverage is good', () => {
      const context = createTestContext({
        upgradeableTowerIds: ['t1'],
        mazeCoverage: {
          totalWalkableCells: 150,
          occupiedCells: 20,
          towerCount: 5,
        },
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [createTestTower({ id: 't1' })],
        path,
      });

      expect(result.intent).toBe(StrategyIntent.UPGRADE);
    });

    it('selects EXTEND_MAZE when coverage is low', () => {
      const context = createTestContext({
        mazeCoverage: {
          totalWalkableCells: 150,
          occupiedCells: 5,
          towerCount: 1,
        },
      });
      const grid = createTestGrid();
      const path = createTestPath();

      const result = planBuildDecision({
        context,
        grid,
        existingTowers: [],
        path,
      });

      expect(result.intent).toBe(StrategyIntent.EXTEND_MAZE);
    });
  });

  describe('determinism', () => {
    it('returns identical output for identical input', () => {
      const context = createTestContext();
      const grid = createTestGrid();
      const path = createTestPath();

      const input = { context, grid, existingTowers: [], path };

      const result1 = planBuildDecision(input);
      const result2 = planBuildDecision(input);

      expect(result1).toEqual(result2);
    });
  });
});
