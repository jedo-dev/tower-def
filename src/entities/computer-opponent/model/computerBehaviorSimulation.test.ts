import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { DuelMatchState } from '../../duel-match/model/types';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from '../../duel-match/model/state';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { createTowerLevel } from '../../tower/model/upgrade';
import { Difficulty } from '../../difficulty/model/types';
import type { DecisionContext, DecisionOutput } from './types';
import { StrategyIntent } from './types';
import { scoreTowerPlacement } from './scoreTowerPlacement';
import { planBuildDecision } from './planBuildDecision';
import { planSendCreeps } from './planSendCreeps';

type SimulationState = {
  matchState: DuelMatchState;
  grid: GridModel;
  path: readonly GridPosition[];
  towers: readonly TowerEntity[];
  spentGold: number;
  sentGold: number;
  incomeGained: number;
};

type RoundProfile = {
  seed: number;
  gold: number;
  income: number;
  round: number;
  threatLevel: DecisionContext['threat']['threatLevel'];
  incomingCreepCount: number;
  estimatedLeakCount: number;
  leakHistory: DecisionContext['leakHistory'];
  occupiedCells: number;
  intent?: DecisionContext['intent'];
  availableBuildPositions: readonly GridPosition[];
};

const MATCHUP_PLAYER_RACE = RaceId.HUMAN;
const MATCHUP_OPPONENT_RACE = RaceId.ORC;

function createTower(id: string, position: GridPosition, level: number): TowerEntity {
  const levelConfig = createTowerLevel(TowerTypeId.ARCHER, level);

  return {
    id,
    position,
    cost: 50,
    type: TowerTypeId.ARCHER,
    level,
    combatStats: levelConfig?.combatStats ?? TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.ARCHER],
  };
}

function createCorridorGrid(): GridModel {
  const baseGrid = createGridModel({ entrance: DEFAULT_ENTRANCE, exit: DEFAULT_EXIT });

  return {
    ...baseGrid,
    cells: baseGrid.cells.map((cell) => {
      if (cell.y === DEFAULT_ENTRANCE.y) {
        return { ...cell };
      }

      return { ...cell, isWalkable: false, isOccupied: true };
    }),
  };
}

function buildContext(profile: RoundProfile, state: SimulationState): DecisionContext {
  return {
    gold: profile.gold,
    income: profile.income,
    hp: state.matchState.opponent.hp,
    raceId: state.matchState.opponent.raceId,
    difficulty: Difficulty.HARD,
    round: profile.round,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: state.grid.cells.filter((cell) => cell.isWalkable).length,
      occupiedCells: profile.occupiedCells,
      towerCount: state.towers.length,
    },
    threat: {
      incomingCreepCount: profile.incomingCreepCount,
      estimatedLeakCount: profile.estimatedLeakCount,
      threatLevel: profile.threatLevel,
    },
    leakHistory: profile.leakHistory,
    affordableTowers: profile.gold >= 50 ? [TowerTypeId.ARCHER] : [],
    upgradeableTowerIds: state.towers.filter((tower) => tower.level < 3).map((tower) => tower.id),
    availableBuildPositions: profile.availableBuildPositions,
    intent: profile.intent,
  };
}

function applyBuildDecision(state: SimulationState, output: DecisionOutput): SimulationState {
  let grid = state.grid;
  let towers = [...state.towers];
  let spentGold = state.spentGold;

  for (const action of output.actions) {
    if (action.kind === 'build') {
      const tower = createTower(`seeded_tower_${towers.length + 1}`, action.position, 1);
      towers = [...towers, tower];
      spentGold += tower.cost;
      grid = {
        ...grid,
        cells: grid.cells.map((cell) =>
          cell.x === action.position.x && cell.y === action.position.y
            ? { ...cell, isOccupied: true }
            : cell,
        ),
      };
    }

    if (action.kind === 'upgrade') {
      towers = towers.map((tower) => {
        if (tower.id !== action.towerId) {
          return tower;
        }

        const nextLevel = tower.level + 1;
        return createTower(tower.id, tower.position, nextLevel);
      });
      spentGold += 40;
    }
  }

  return { ...state, grid, towers, spentGold };
}

function simulateSeededRound(state: SimulationState, profile: RoundProfile): {
  state: SimulationState;
  buildOutput: DecisionOutput;
  sendActionCount: number;
} {
  const context = buildContext(profile, state);
  const buildOutput = planBuildDecision({
    context,
    grid: state.grid,
    existingTowers: state.towers,
    path: state.path,
  });

  const stateAfterBuild = applyBuildDecision(state, buildOutput);
  const sendOutput = planSendCreeps({
    context: {
      ...buildContext(profile, stateAfterBuild),
      intent: profile.intent,
    },
  });

  return {
    state: {
      ...stateAfterBuild,
      sentGold: stateAfterBuild.sentGold + sendOutput.totalCost,
      incomeGained: stateAfterBuild.incomeGained + sendOutput.totalIncomeBonus,
    },
    buildOutput,
    sendActionCount: sendOutput.actions.length,
  };
}

function createSimulationState(): SimulationState {
  const matchState = createInitialDuelMatchState(MATCHUP_PLAYER_RACE, MATCHUP_OPPONENT_RACE);
  const grid = matchState.opponent.battlefield.grid;

  return {
    matchState,
    grid,
    path: findPathBfs(grid).path,
    towers: [],
    spentGold: 0,
    sentGold: 0,
    incomeGained: 0,
  };
}

describe('entities/computer-opponent/computerBehaviorSimulation', () => {
  it('simulates a deterministic human-vs-orc matchup with builds, upgrades, and sends', () => {
    let state = createSimulationState();
    expect(state.matchState.player.raceId).toBe(MATCHUP_PLAYER_RACE);
    expect(state.matchState.opponent.raceId).toBe(MATCHUP_OPPONENT_RACE);

    const buildRound: RoundProfile = {
      seed: 101,
      gold: 500,
      income: 50,
      round: 1,
      threatLevel: 'low',
      incomingCreepCount: 2,
      estimatedLeakCount: 0,
      leakHistory: [],
      occupiedCells: 2,
      availableBuildPositions: [{ x: 4, y: 6 }, { x: 5, y: 8 }, { x: 7, y: 6 }],
    };

    const firstRound = simulateSeededRound(state, buildRound);
    state = firstRound.state;

    expect(buildRound.seed).toBe(101);
    expect(firstRound.buildOutput.intent).toBe(StrategyIntent.EXTEND_MAZE);
    expect(firstRound.buildOutput.actions.some((action) => action.kind === 'build')).toBe(true);
    expect(firstRound.sendActionCount).toBeGreaterThan(0);
    expect(state.towers).toHaveLength(3);

    state = {
      ...state,
      towers: [
        ...state.towers,
        createTower('seeded_tower_2', { x: 2, y: 5 }, 1),
        createTower('seeded_tower_3', { x: 7, y: 9 }, 1),
      ],
    };

    const upgradeRound: RoundProfile = {
      seed: 102,
      gold: 300,
      income: 62,
      round: 2,
      threatLevel: 'low',
      incomingCreepCount: 3,
      estimatedLeakCount: 0,
      leakHistory: [],
      occupiedCells: 24,
      availableBuildPositions: [{ x: 1, y: 5 }, { x: 8, y: 8 }],
    };

    const secondRound = simulateSeededRound(state, upgradeRound);

    expect(upgradeRound.seed).toBe(102);
    expect(secondRound.buildOutput.intent).toBe(StrategyIntent.UPGRADE);
    expect(secondRound.buildOutput.actions.some((action) => action.kind === 'upgrade')).toBe(true);
    expect(secondRound.state.towers.some((tower) => tower.level === 2)).toBe(true);
  });

  it('spends pressure-heavy seed gold on creep sends instead of defense when threat is low', () => {
    const state = createSimulationState();
    const pressureRound: RoundProfile = {
      seed: 201,
      gold: 1000,
      income: 80,
      round: 4,
      threatLevel: 'low',
      incomingCreepCount: 1,
      estimatedLeakCount: 0,
      leakHistory: [],
      occupiedCells: 30,
      intent: StrategyIntent.PRESSURE,
      availableBuildPositions: [{ x: 3, y: 5 }],
    };

    const result = simulateSeededRound(state, pressureRound);

    expect(pressureRound.seed).toBe(201);
    expect(result.sendActionCount).toBeGreaterThanOrEqual(3);
    expect(result.state.sentGold).toBeGreaterThan(0);
    expect(result.state.incomeGained).toBeGreaterThan(0);
  });

  it('saves on a fixed low-gold seed when no build, upgrade, or send is affordable', () => {
    const state = createSimulationState();
    const saveRound: RoundProfile = {
      seed: 301,
      gold: 20,
      income: 50,
      round: 3,
      threatLevel: 'medium',
      incomingCreepCount: 6,
      estimatedLeakCount: 1,
      leakHistory: [],
      occupiedCells: 5,
      availableBuildPositions: [{ x: 4, y: 5 }],
    };

    const result = simulateSeededRound(state, saveRound);

    expect(saveRound.seed).toBe(301);
    expect(result.buildOutput.actions).toEqual([{ kind: 'save' }]);
    expect(result.sendActionCount).toBe(0);
    expect(result.state.spentGold).toBe(0);
    expect(result.state.sentGold).toBe(0);
  });

  it('rejects path-blocking build positions in a fixed corridor seed', () => {
    const corridorGrid = createCorridorGrid();
    const path = findPathBfs(corridorGrid).path;
    const state: SimulationState = {
      ...createSimulationState(),
      grid: corridorGrid,
      path,
    };
    const blockingPosition = { x: 5, y: DEFAULT_ENTRANCE.y };
    const blockingScore = scoreTowerPlacement({
      grid: corridorGrid,
      position: blockingPosition,
      towerType: TowerTypeId.ARCHER,
      existingTowers: [],
      path,
    });
    const blockingRound: RoundProfile = {
      seed: 401,
      gold: 500,
      income: 50,
      round: 5,
      threatLevel: 'high',
      incomingCreepCount: 12,
      estimatedLeakCount: 3,
      leakHistory: [{ round: 4, leakedCount: 2 }],
      occupiedCells: 140,
      availableBuildPositions: [blockingPosition],
    };

    const result = simulateSeededRound(state, blockingRound);

    expect(blockingRound.seed).toBe(401);
    expect(blockingScore.isValid).toBe(false);
    expect(blockingScore.invalidReason).toBe('blocks_path');
    expect(result.buildOutput.intent).toBe(StrategyIntent.DEFEND);
    expect(result.buildOutput.actions).toEqual([{ kind: 'save' }]);
    expect(result.state.towers).toHaveLength(0);
  });
});
