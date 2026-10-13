import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import {
  canOccupyFootprint,
  doFootprintsOverlap,
  withFootprintOccupancy,
} from '../../../shared/lib/grid/footprint';
import { createDefaultEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { createPathProbe } from './createPathProbe';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { Difficulty } from '../../difficulty/model/types';
import { getTowerCenter } from '../../tower/model/footprint';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL, TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { planBuildDecision } from './planBuildDecision';
import type { DecisionContext } from './types';

const { entrance: ENTRANCE, exit: EXIT } = createDefaultEdgeEndpoints();

type FieldState = {
  grid: GridModel;
  towers: TowerEntity[];
};

function createField(): FieldState {
  return { grid: createGridModel({ entrance: ENTRANCE, exit: EXIT }), towers: [] };
}

function withTower(field: FieldState, position: GridPosition, towerType: TowerTypeId): FieldState {
  return {
    grid: withFootprintOccupancy(field.grid, position, TOWER_FOOTPRINT, true),
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
      .filter((cell) => canOccupyFootprint(field.grid, cell, TOWER_FOOTPRINT))
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
    const openFieldLength = createPathProbe(createField().grid).baseCost;

    const field = playBuildRounds(20, Difficulty.HARD);
    const mazedLength = createPathProbe(field.grid).baseCost;

    expect(field.towers.length).toBeGreaterThan(20);
    expect(mazedLength).toBeGreaterThan(openFieldLength * 3);
  });

  it('places 2x2 blocks that never overlap', () => {
    const field = playBuildRounds(20, Difficulty.HARD);

    field.towers.forEach((tower, index) => {
      field.towers.slice(index + 1).forEach((other) => {
        expect(
          doFootprintsOverlap(tower.position, TOWER_FOOTPRINT, other.position, TOWER_FOOTPRINT),
        ).toBe(false);
      });
    });
    expect(field.grid.cells.filter((cell) => cell.isOccupied)).toHaveLength(
      field.towers.length * TOWER_FOOTPRINT.width * TOWER_FOOTPRINT.height,
    );
  });

  it('always leaves a route to the exit', () => {
    const field = playBuildRounds(20, Difficulty.HARD);

    expect(createPathProbe(field.grid).basePath.length).toBeGreaterThan(0);
  });

  it('builds walls rather than scattered towers', () => {
    const field = playBuildRounds(12, Difficulty.HARD);

    // Grown by one cell on every side, a block overlaps exactly the blocks it touches.
    const grownFootprint = {
      width: TOWER_FOOTPRINT.width + 2,
      height: TOWER_FOOTPRINT.height + 2,
    };
    const touchingAnother = field.towers.filter((tower) =>
      field.towers.some(
        (other) =>
          other !== tower &&
          doFootprintsOverlap(
            { x: tower.position.x - 1, y: tower.position.y - 1 },
            grownFootprint,
            other.position,
            TOWER_FOOTPRINT,
          ),
      ),
    );

    expect(touchingAnother.length / field.towers.length).toBeGreaterThan(0.8);
  });

  it('lets a harder opponent wall off more of the field than an easy one', () => {
    const easy = playBuildRounds(20, Difficulty.EASY);
    const nightmare = playBuildRounds(20, Difficulty.NIGHTMARE);

    expect(nightmare.towers.length).toBeGreaterThan(easy.towers.length);
    expect(createPathProbe(nightmare.grid).baseCost).toBeGreaterThan(
      createPathProbe(easy.grid).baseCost,
    );
  });

  it('keeps every tower within reach of the route it created', () => {
    const field = playBuildRounds(16, Difficulty.HARD);
    const path = createPathProbe(field.grid).basePath;
    const range = TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.SINGLE].range;

    const covering = field.towers.filter((tower) => {
      const center = getTowerCenter(tower);
      return path.some((cell) => Math.hypot(cell.x - center.x, cell.y - center.y) <= range);
    });

    expect(covering.length).toBe(field.towers.length);
  });
});
