import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createPathProbe } from '../../../shared/lib/pathfinding/createPathProbe';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { Difficulty } from '../../difficulty/model/types';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { planBuildDecision } from './planBuildDecision';
import type { DecisionContext } from './types';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

type FieldState = {
  grid: GridModel;
  towers: TowerEntity[];
};

function createField(): FieldState {
  return { grid: createGridModel({ entrance: ENTRANCE, exit: EXIT }), towers: [] };
}

function withTower(field: FieldState, position: GridPosition, towerType: TowerTypeId): FieldState {
  return {
    grid: {
      ...field.grid,
      cells: field.grid.cells.map((cell) =>
        cell.x === position.x && cell.y === position.y
          ? { ...cell, isOccupied: true, isWalkable: false }
          : cell,
      ),
    },
    towers: [
      ...field.towers,
      {
        id: `computer:tower:${position.x}:${position.y}`,
        position,
        cost: 50,
        type: towerType,
        level: TOWER_BASE_LEVEL,
        combatStats: { ...TOWER_COMBAT_STATS_BY_TYPE[towerType] },
      },
    ],
  };
}

function createContext(field: FieldState, round: number, difficulty: Difficulty): DecisionContext {
  return {
    gold: 400,
    income: 50,
    hp: 20,
    raceId: RaceId.UNDEAD,
    difficulty,
    round,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: field.grid.cells.filter((cell) => cell.isWalkable).length,
      occupiedCells: field.grid.cells.filter((cell) => cell.isOccupied).length,
      towerCount: field.towers.length,
    },
    threat: { incomingCreepCount: 0, estimatedLeakCount: 0, threatLevel: 'low' },
    leakHistory: [],
    affordableTowers: [TowerTypeId.SINGLE],
    upgradeableTowerIds: [],
    availableBuildPositions: field.grid.cells
      .filter((cell) => cell.isWalkable && !cell.isOccupied && cell.role === 'empty')
      .map((cell) => ({ x: cell.x, y: cell.y })),
    enemy: { hp: 20, income: 50, towerCount: 0 },
  };
}

/** Plays `rounds` build phases, applying every build the planner asks for. */
function playBuildRounds(rounds: number, difficulty: Difficulty): FieldState {
  let field = createField();

  for (let round = 1; round <= rounds; round += 1) {
    const probe = createPathProbe(field.grid);
    const decision = planBuildDecision({
      context: createContext(field, round, difficulty),
      grid: field.grid,
      existingTowers: field.towers,
      path: probe.basePath,
    });

    for (const action of decision.actions) {
      if (action.kind === 'build') {
        field = withTower(field, action.position, action.towerType);
      }
    }
  }

  return field;
}

describe('entities/computer-opponent/mazeBuildingBehavior', () => {
  it('turns a straight corridor into a long detour', () => {
    const openFieldLength = createPathProbe(createField().grid).baseLength;

    const field = playBuildRounds(20, Difficulty.HARD);
    const mazedLength = createPathProbe(field.grid).baseLength;

    expect(field.towers.length).toBeGreaterThan(20);
    expect(mazedLength).toBeGreaterThan(openFieldLength * 3);
  });

  it('always leaves a route to the exit', () => {
    const field = playBuildRounds(20, Difficulty.HARD);

    expect(createPathProbe(field.grid).basePath.length).toBeGreaterThan(0);
  });

  it('builds walls rather than scattered towers', () => {
    const field = playBuildRounds(12, Difficulty.HARD);

    const towerKeys = new Set(field.towers.map((t) => `${t.position.x}:${t.position.y}`));
    const touchingAnother = field.towers.filter((tower) =>
      [
        { x: tower.position.x + 1, y: tower.position.y },
        { x: tower.position.x - 1, y: tower.position.y },
        { x: tower.position.x, y: tower.position.y + 1 },
        { x: tower.position.x, y: tower.position.y - 1 },
      ].some((neighbor) => towerKeys.has(`${neighbor.x}:${neighbor.y}`)),
    );

    expect(touchingAnother.length / field.towers.length).toBeGreaterThan(0.8);
  });

  it('lets a harder opponent wall off more of the field than an easy one', () => {
    const easy = playBuildRounds(20, Difficulty.EASY);
    const nightmare = playBuildRounds(20, Difficulty.NIGHTMARE);

    expect(nightmare.towers.length).toBeGreaterThan(easy.towers.length);
    expect(createPathProbe(nightmare.grid).baseLength).toBeGreaterThan(
      createPathProbe(easy.grid).baseLength,
    );
  });

  it('keeps every tower within reach of the route it created', () => {
    const field = playBuildRounds(16, Difficulty.HARD);
    const path = createPathProbe(field.grid).basePath;
    const range = TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE].range;

    const covering = field.towers.filter((tower) =>
      path.some(
        (cell) =>
          Math.hypot(cell.x - tower.position.x, cell.y - tower.position.y) <= range,
      ),
    );

    expect(covering.length).toBe(field.towers.length);
  });
});
