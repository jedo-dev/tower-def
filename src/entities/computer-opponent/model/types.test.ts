import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../difficulty/model/types';
import { RaceId } from '../../../shared/types/content-ids';
import { TowerTypeId } from '../../../shared/types/content-ids';
import {
  StrategyIntent,
  STRATEGY_INTENTS,
} from './types';
import type {
  BuildAction,
  ComputerAction,
  ComputerOpponentStrategy,
  DecisionContext,
  DecisionOutput,
  LeakHistoryEntry,
  MazeCoverageMetrics,
  SaveAction,
  SendCreepAction,
  ThreatAssessment,
  UpgradeAction,
} from './types';

describe('entities/computer-opponent/types', () => {
  describe('StrategyIntent', () => {
    it('contains all required intents', () => {
      expect(STRATEGY_INTENTS).toContain(StrategyIntent.DEFEND);
      expect(STRATEGY_INTENTS).toContain(StrategyIntent.UPGRADE);
      expect(STRATEGY_INTENTS).toContain(StrategyIntent.EXTEND_MAZE);
      expect(STRATEGY_INTENTS).toContain(StrategyIntent.SAVE_GOLD);
      expect(STRATEGY_INTENTS).toContain(StrategyIntent.PRESSURE);
    });

    it('has exactly 5 intents', () => {
      expect(STRATEGY_INTENTS).toHaveLength(5);
    });

    it('each intent has correct string value', () => {
      expect(StrategyIntent.DEFEND).toBe('defend');
      expect(StrategyIntent.UPGRADE).toBe('upgrade');
      expect(StrategyIntent.EXTEND_MAZE).toBe('extend_maze');
      expect(StrategyIntent.SAVE_GOLD).toBe('save_gold');
      expect(StrategyIntent.PRESSURE).toBe('pressure');
    });

    it('STRATEGY_INTENTS is readonly', () => {
      expect(Array.isArray(STRATEGY_INTENTS)).toBe(true);
    });
  });

  describe('DecisionContext', () => {
    it('can be instantiated with all required fields', () => {
      const context: DecisionContext = {
        gold: 100,
        income: 10,
        hp: 20,
        raceId: RaceId.UNDEAD,
        difficulty: Difficulty.NORMAL,
        round: 1,
        phase: 'build',
        mazeCoverage: {
          totalWalkableCells: 150,
          occupiedCells: 10,
          towerCount: 5,
        },
        threat: {
          incomingCreepCount: 5,
          estimatedLeakCount: 0,
          threatLevel: 'low',
        },
        leakHistory: [],
        affordableTowers: [TowerTypeId.ARCHER],
        upgradeableTowerIds: ['tower_1'],
        availableBuildPositions: [{ x: 0, y: 0 }],
      };

      expect(context.gold).toBe(100);
      expect(context.income).toBe(10);
      expect(context.hp).toBe(20);
      expect(context.raceId).toBe(RaceId.UNDEAD);
      expect(context.difficulty).toBe(Difficulty.NORMAL);
      expect(context.round).toBe(1);
      expect(context.phase).toBe('build');
    });

    it('supports all difficulty levels', () => {
      const difficulties: Difficulty[] = [
        Difficulty.EASY,
        Difficulty.NORMAL,
        Difficulty.HARD,
        Difficulty.NIGHTMARE,
      ];

      for (const difficulty of difficulties) {
        const context: DecisionContext = {
          gold: 100,
          income: 10,
          hp: 20,
          raceId: RaceId.ORC,
          difficulty,
          round: 1,
          phase: 'build',
          mazeCoverage: {
            totalWalkableCells: 150,
            occupiedCells: 10,
            towerCount: 5,
          },
          threat: {
            incomingCreepCount: 5,
            estimatedLeakCount: 0,
            threatLevel: 'low',
          },
          leakHistory: [],
          affordableTowers: [],
          upgradeableTowerIds: [],
          availableBuildPositions: [],
        };
        expect(context.difficulty).toBe(difficulty);
      }
    });

    it('supports all race ids', () => {
      const races: RaceId[] = [RaceId.UNDEAD, RaceId.ORC, RaceId.HUMAN, RaceId.ELF];

      for (const raceId of races) {
        const context: DecisionContext = {
          gold: 100,
          income: 10,
          hp: 20,
          raceId,
          difficulty: Difficulty.NORMAL,
          round: 1,
          phase: 'build',
          mazeCoverage: {
            totalWalkableCells: 150,
            occupiedCells: 10,
            towerCount: 5,
          },
          threat: {
            incomingCreepCount: 5,
            estimatedLeakCount: 0,
            threatLevel: 'low',
          },
          leakHistory: [],
          affordableTowers: [],
          upgradeableTowerIds: [],
          availableBuildPositions: [],
        };
        expect(context.raceId).toBe(raceId);
      }
    });

    it('supports both phases', () => {
      for (const phase of ['build', 'battle'] as const) {
        const context: DecisionContext = {
          gold: 100,
          income: 10,
          hp: 20,
          raceId: RaceId.HUMAN,
          difficulty: Difficulty.NORMAL,
          round: 1,
          phase,
          mazeCoverage: {
            totalWalkableCells: 150,
            occupiedCells: 10,
            towerCount: 5,
          },
          threat: {
            incomingCreepCount: 5,
            estimatedLeakCount: 0,
            threatLevel: 'low',
          },
          leakHistory: [],
          affordableTowers: [],
          upgradeableTowerIds: [],
          availableBuildPositions: [],
        };
        expect(context.phase).toBe(phase);
      }
    });
  });

  describe('MazeCoverageMetrics', () => {
    it('can be instantiated', () => {
      const metrics: MazeCoverageMetrics = {
        totalWalkableCells: 150,
        occupiedCells: 30,
        towerCount: 15,
      };

      expect(metrics.totalWalkableCells).toBe(150);
      expect(metrics.occupiedCells).toBe(30);
      expect(metrics.towerCount).toBe(15);
    });
  });

  describe('ThreatAssessment', () => {
    it('supports all threat levels', () => {
      for (const level of ['low', 'medium', 'high'] as const) {
        const threat: ThreatAssessment = {
          incomingCreepCount: 5,
          estimatedLeakCount: 0,
          threatLevel: level,
        };
        expect(threat.threatLevel).toBe(level);
      }
    });
  });

  describe('LeakHistoryEntry', () => {
    it('can be instantiated', () => {
      const entry: LeakHistoryEntry = {
        round: 3,
        leakedCount: 2,
      };

      expect(entry.round).toBe(3);
      expect(entry.leakedCount).toBe(2);
    });
  });

  describe('ComputerAction', () => {
    it('BuildAction has correct kind', () => {
      const action: BuildAction = {
        kind: 'build',
        towerType: TowerTypeId.ARCHER,
        position: { x: 5, y: 10 },
      };

      expect(action.kind).toBe('build');
      expect(action.towerType).toBe(TowerTypeId.ARCHER);
      expect(action.position).toEqual({ x: 5, y: 10 });
    });

    it('UpgradeAction has correct kind', () => {
      const action: UpgradeAction = {
        kind: 'upgrade',
        towerId: 'tower_1',
      };

      expect(action.kind).toBe('upgrade');
      expect(action.towerId).toBe('tower_1');
    });

    it('SendCreepAction has correct kind', () => {
      const action: SendCreepAction = {
        kind: 'send_creep',
        creepTypeId: 'undead_skeleton',
      };

      expect(action.kind).toBe('send_creep');
      expect(action.creepTypeId).toBe('undead_skeleton');
    });

    it('SaveAction has correct kind', () => {
      const action: SaveAction = {
        kind: 'save',
      };

      expect(action.kind).toBe('save');
    });

    it('ComputerAction union accepts all action types', () => {
      const actions: ComputerAction[] = [
        { kind: 'build', towerType: TowerTypeId.ARCHER, position: { x: 0, y: 0 } },
        { kind: 'upgrade', towerId: 'tower_1' },
        { kind: 'send_creep', creepTypeId: 'undead_skeleton' },
        { kind: 'save' },
      ];

      expect(actions).toHaveLength(4);
      expect(actions[0].kind).toBe('build');
      expect(actions[1].kind).toBe('upgrade');
      expect(actions[2].kind).toBe('send_creep');
      expect(actions[3].kind).toBe('save');
    });
  });

  describe('DecisionOutput', () => {
    it('can be instantiated with all fields', () => {
      const output: DecisionOutput = {
        intent: StrategyIntent.DEFEND,
        actions: [{ kind: 'build', towerType: TowerTypeId.ARCHER, position: { x: 3, y: 5 } }],
        reasoning: 'High threat level, need more defense',
        confidenceScore: 0.85,
      };

      expect(output.intent).toBe(StrategyIntent.DEFEND);
      expect(output.actions).toHaveLength(1);
      expect(output.reasoning).toBe('High threat level, need more defense');
      expect(output.confidenceScore).toBe(0.85);
    });

    it('supports all strategy intents', () => {
      for (const intent of STRATEGY_INTENTS) {
        const output: DecisionOutput = {
          intent,
          actions: [],
          reasoning: 'Test reasoning',
          confidenceScore: 0.5,
        };
        expect(output.intent).toBe(intent);
      }
    });

    it('can have multiple actions', () => {
      const output: DecisionOutput = {
        intent: StrategyIntent.EXTEND_MAZE,
        actions: [
          { kind: 'build', towerType: TowerTypeId.ARCHER, position: { x: 1, y: 1 } },
          { kind: 'build', towerType: TowerTypeId.SPLASH, position: { x: 2, y: 2 } },
          { kind: 'upgrade', towerId: 'tower_1' },
        ],
        reasoning: 'Multiple improvements needed',
        confidenceScore: 0.7,
      };

      expect(output.actions).toHaveLength(3);
    });

    it('can have empty actions', () => {
      const output: DecisionOutput = {
        intent: StrategyIntent.SAVE_GOLD,
        actions: [],
        reasoning: 'Saving gold for next round',
        confidenceScore: 0.9,
      };

      expect(output.actions).toHaveLength(0);
    });
  });

  describe('ComputerOpponentStrategy', () => {
    it('can be instantiated with all fields', () => {
      const strategy: ComputerOpponentStrategy = {
        difficulty: Difficulty.HARD,
        raceId: RaceId.ORC,
        currentIntent: StrategyIntent.DEFEND,
        decisionHistory: [],
      };

      expect(strategy.difficulty).toBe(Difficulty.HARD);
      expect(strategy.raceId).toBe(RaceId.ORC);
      expect(strategy.currentIntent).toBe(StrategyIntent.DEFEND);
      expect(strategy.decisionHistory).toEqual([]);
    });

    it('decision history can contain multiple entries', () => {
      const strategy: ComputerOpponentStrategy = {
        difficulty: Difficulty.NORMAL,
        raceId: RaceId.UNDEAD,
        currentIntent: StrategyIntent.UPGRADE,
        decisionHistory: [
          {
            intent: StrategyIntent.DEFEND,
            actions: [{ kind: 'build', towerType: TowerTypeId.ARCHER, position: { x: 1, y: 1 } }],
            reasoning: 'Initial defense',
            confidenceScore: 0.8,
          },
          {
            intent: StrategyIntent.UPGRADE,
            actions: [{ kind: 'upgrade', towerId: 'tower_1' }],
            reasoning: 'Upgrade existing tower',
            confidenceScore: 0.75,
          },
        ],
      };

      expect(strategy.decisionHistory).toHaveLength(2);
      expect(strategy.decisionHistory[0].intent).toBe(StrategyIntent.DEFEND);
      expect(strategy.decisionHistory[1].intent).toBe(StrategyIntent.UPGRADE);
    });
  });
});
