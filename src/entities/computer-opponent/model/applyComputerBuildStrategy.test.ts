import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { addTower, createBattlefieldState } from '../../duel-match/model/battlefieldOps';
import { createInitialDuelMatchState, DEFAULT_ENTRANCE, DEFAULT_EXIT } from '../../duel-match/model/state';
import type { DuelMatchState } from '../../duel-match/model/types';
import { Difficulty } from '../../difficulty/model/types';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { getUpgradeCost } from '../../tower/model/upgrade';
import type { DecisionContext } from './types';
import { StrategyIntent } from './types';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';

const PLAYER_RACE = RaceId.HUMAN;
const OPPONENT_RACE = RaceId.ORC;

function createTower(id: string, position: GridPosition, level = TOWER_BASE_LEVEL): TowerEntity {
  return {
    id,
    position: { x: position.x, y: position.y },
    cost: 50,
    type: TowerTypeId.ARCHER,
    level,
    combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.ARCHER] },
  };
}

function createState(overrides?: Partial<DuelMatchState>): DuelMatchState {
  return {
    ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE),
    ...overrides,
  };
}

function createContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 500,
    income: 50,
    hp: 20,
    raceId: OPPONENT_RACE,
    difficulty: Difficulty.HARD,
    round: 1,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: 150,
      occupiedCells: 4,
      towerCount: 1,
    },
    threat: {
      incomingCreepCount: 1,
      estimatedLeakCount: 0,
      threatLevel: 'low',
    },
    leakHistory: [],
    affordableTowers: [TowerTypeId.ARCHER],
    upgradeableTowerIds: [],
    availableBuildPositions: [{ x: 4, y: 6 }, { x: 5, y: 8 }],
    ...overrides,
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

function withOpponentBattlefield(
  state: DuelMatchState,
  grid: GridModel,
  towers: readonly TowerEntity[],
): DuelMatchState {
  const path = findPathBfs(grid).path;
  let battlefield = createBattlefieldState(grid, path);
  for (const tower of towers) {
    battlefield = addTower(battlefield, tower);
  }

  return {
    ...state,
    opponent: {
      ...state.opponent,
      battlefield,
    },
  };
}

describe('entities/computer-opponent/applyComputerBuildStrategy', () => {
  it('places deterministic computer towers on the opponent battlefield for opponent view rendering', () => {
    const state = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 500,
      },
    });
    const context = createContext({ gold: state.opponent.gold });

    const result = applyComputerBuildStrategy({ state, context });

    expect(result.decision.intent).toBe(StrategyIntent.EXTEND_MAZE);
    expect(result.builtCount).toBe(1);
    expect(result.upgradedCount).toBe(0);
    expect(result.state.player).toBe(state.player);
    expect(result.state.opponent.battlefield.towers).toHaveLength(1);

    const builtTower = result.state.opponent.battlefield.towers[0];
    expect(builtTower.id).toBe(`computer:tower:${builtTower.position.x}:${builtTower.position.y}`);
    expect(context.availableBuildPositions).toContainEqual(builtTower.position);
    expect(result.state.opponent.gold).toBe(state.opponent.gold - builtTower.cost);

    const builtCell = result.state.opponent.battlefield.grid.cells.find(
      (cell) => cell.x === builtTower.position.x && cell.y === builtTower.position.y,
    );
    expect(builtCell?.isOccupied).toBe(true);
    expect(builtCell?.isWalkable).toBe(false);
    expect(findPathBfs(result.state.opponent.battlefield.grid).found).toBe(true);
  });

  it('upgrades computer towers on the opponent battlefield without mutating player battlefield', () => {
    const baseState = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 500,
      },
    });
    const grid = baseState.opponent.battlefield.grid;
    const towers = [
      createTower('computer:tower:2:5', { x: 2, y: 5 }),
      createTower('computer:tower:4:6', { x: 4, y: 6 }),
      createTower('computer:tower:7:9', { x: 7, y: 9 }),
    ];
    const state = withOpponentBattlefield(baseState, grid, towers);
    const context = createContext({
      gold: state.opponent.gold,
      mazeCoverage: {
        totalWalkableCells: 150,
        occupiedCells: 30,
        towerCount: towers.length,
      },
      upgradeableTowerIds: towers.map((tower) => tower.id),
      availableBuildPositions: [],
    });
    const expectedUpgradeCost = getUpgradeCost(TowerTypeId.ARCHER, TOWER_BASE_LEVEL);

    const result = applyComputerBuildStrategy({ state, context });

    expect(result.decision.intent).toBe(StrategyIntent.UPGRADE);
    expect(result.builtCount).toBe(0);
    expect(result.upgradedCount).toBe(1);
    expect(result.spentGold).toBe(expectedUpgradeCost);
    expect(result.state.player.battlefield).toBe(state.player.battlefield);
    expect(result.state.opponent.gold).toBe(state.opponent.gold - (expectedUpgradeCost ?? 0));
    expect(result.state.opponent.battlefield.towers.some((tower) => tower.level === 2)).toBe(true);
  });

  it('rejects path-blocking computer builds so the rendered opponent field remains path-valid', () => {
    const corridorGrid = createCorridorGrid();
    const baseState = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 500,
      },
    });
    const state = withOpponentBattlefield(baseState, corridorGrid, []);
    const blockingPosition = { x: 5, y: DEFAULT_ENTRANCE.y };
    const context = createContext({
      gold: state.opponent.gold,
      threat: {
        incomingCreepCount: 12,
        estimatedLeakCount: 3,
        threatLevel: 'high',
      },
      leakHistory: [{ round: 1, leakedCount: 2 }],
      availableBuildPositions: [blockingPosition],
      mazeCoverage: {
        totalWalkableCells: corridorGrid.cells.filter((cell) => cell.isWalkable).length,
        occupiedCells: 140,
        towerCount: 0,
      },
    });

    const result = applyComputerBuildStrategy({ state, context });

    expect(result.decision.intent).toBe(StrategyIntent.DEFEND);
    expect(result.builtCount).toBe(0);
    expect(result.state.opponent.battlefield.towers).toHaveLength(0);
    expect(result.state.opponent.gold).toBe(state.opponent.gold);
    expect(findPathBfs(result.state.opponent.battlefield.grid).found).toBe(true);
  });

  it('is deterministic for identical opponent battlefield inputs', () => {
    const state = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 500,
      },
    });
    const context = createContext({ gold: state.opponent.gold });

    const firstResult = applyComputerBuildStrategy({ state, context });
    const secondResult = applyComputerBuildStrategy({ state, context });

    expect(firstResult).toEqual(secondResult);
  });
});
