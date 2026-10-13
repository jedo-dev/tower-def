import { describe, expect, it } from 'vitest';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createPathProbe } from './createPathProbe';
import { findPathBfs } from '../../../shared/lib/pathfinding/hasPathBfs';
import { createMazeSkeleton } from './createMazeSkeleton';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerEntity } from '../../tower/model/types';
import { scoreTowerPlacement, scoreAllPlacements } from './scoreTowerPlacement';

const ENTRANCE = { x: 0, y: 7 };
const EXIT = { x: 9, y: 7 };

function createTestGrid() {
  return createGridModel({ entrance: ENTRANCE, exit: EXIT });
}

function createTestTower(overrides?: {
  id?: string;
  x?: number;
  y?: number;
  type?: 'single' | 'splash';
}): TowerEntity {
  return {
    id: overrides?.id ?? 'tower_1',
    position: { x: overrides?.x ?? 2, y: overrides?.y ?? 3 },
    cost: 50,
    type: (overrides?.type ?? 'single') as 'single' | 'splash',
    level: 1,
    combatStats: {
      range: 3,
      damage: 20,
      attackCooldownMs: 800,
    },
  };
}

function getTestPath() {
  const grid = createTestGrid();
  return findPathBfs(grid).path;
}

describe('entities/computer-opponent/scoreTowerPlacement', () => {
  describe('scoreTowerPlacement', () => {
    describe('validation', () => {
      it('rejects entrance position', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const result = scoreTowerPlacement({
          grid,
          position: ENTRANCE,
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('entrance_or_exit');
        expect(result.totalScore).toBe(0);
      });

      it('rejects exit position', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const result = scoreTowerPlacement({
          grid,
          position: EXIT,
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('entrance_or_exit');
        expect(result.totalScore).toBe(0);
      });

      it('rejects a block that only partly covers the entrance zone', () => {
        const result = scoreTowerPlacement({
          grid: createTestGrid(),
          position: { x: ENTRANCE.x + 1, y: ENTRANCE.y - 1 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: getTestPath(),
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('entrance_or_exit');
      });

      it('rejects a block hanging off the grid', () => {
        const grid = createTestGrid();

        const result = scoreTowerPlacement({
          grid,
          position: { x: grid.cols - 1, y: 3 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: getTestPath(),
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('out_of_bounds');
      });

      it('rejects a block overlapping a tower in any of its cells', () => {
        const grid = createTestGrid();
        const occupiedGrid = {
          ...grid,
          cells: grid.cells.map((cell) =>
            cell.x === 4 && cell.y === 4 ? { ...cell, isOccupied: true, isWalkable: false } : cell,
          ),
        };

        const result = scoreTowerPlacement({
          grid: occupiedGrid,
          position: { x: 3, y: 3 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: getTestPath(),
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('occupied');
      });

      it('rejects occupied position', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const tower = createTestTower({ x: 3, y: 5 });

        const occupiedGrid = {
          ...grid,
          cells: grid.cells.map((cell) =>
            cell.x === 3 && cell.y === 5 ? { ...cell, isOccupied: true, isWalkable: false } : cell,
          ),
        };

        const result = scoreTowerPlacement({
          grid: occupiedGrid,
          position: { x: 3, y: 5 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [tower],
          path,
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('occupied');
      });

      it('rejects position that blocks path', () => {
        const baseGrid = createTestGrid();
        const path = getTestPath();

        const corridorGrid = {
          ...baseGrid,
          cells: baseGrid.cells.map((cell) => {
            // A two-row corridor: exactly as wide as one tower block.
            if (cell.y === ENTRANCE.y || cell.y === ENTRANCE.y + 1) {
              return { ...cell };
            }
            return { ...cell, isWalkable: false, isOccupied: true };
          }),
        };

        const result = scoreTowerPlacement({
          grid: corridorGrid,
          position: { x: 5, y: 7 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('blocks_path');
      });

      it('accepts valid position on open grid', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const result = scoreTowerPlacement({
          grid,
          position: { x: 1, y: 1 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.isValid).toBe(true);
        expect(result.invalidReason).toBeUndefined();
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
      });
    });

    describe('path coverage scoring', () => {
      it('gives higher score for positions near path', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const nearPath = scoreTowerPlacement({
          grid,
          position: { x: 3, y: 5 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        const farFromPath = scoreTowerPlacement({
          grid,
          position: { x: 0, y: 0 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(nearPath.pathCoverageScore).toBeGreaterThan(farFromPath.pathCoverageScore);
      });

      it('archer tower has larger coverage than splash due to range', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const position = { x: 5, y: 7 };

        const archerScore = scoreTowerPlacement({
          grid,
          position,
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        const splashScore = scoreTowerPlacement({
          grid,
          position,
          towerType: TowerTypeId.SPLASH,
          existingTowers: [],
          path,
        });

        expect(archerScore.pathCoverageScore).toBeGreaterThanOrEqual(splashScore.pathCoverageScore);
      });
    });

    describe('maze scoring', () => {
      it('rewards a wall that makes creeps walk further', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const pathProbe = createPathProbe(grid);

        const onRoute = scoreTowerPlacement({
          grid,
          position: { x: 4, y: 7 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
        });

        const offRoute = scoreTowerPlacement({
          grid,
          position: { x: 4, y: 0 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
        });

        expect(onRoute.mazeGainCells).toBeGreaterThan(0);
        expect(offRoute.mazeGainCells).toBe(0);
        expect(onRoute.mazeGainScore).toBeGreaterThan(offRoute.mazeGainScore);
      });

      it('leaves maze terms neutral when no probe is supplied', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const result = scoreTowerPlacement({
          grid,
          position: { x: 4, y: 7 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.mazeGainCells).toBe(0);
        expect(result.mazeGainScore).toBe(0);
        expect(result.isValid).toBe(true);
      });

      it('ranks cells of the planned comb above cells outside it', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const pathProbe = createPathProbe(grid);
        const mazeSkeleton = createMazeSkeleton(grid);
        const firstPlanned = mazeSkeleton.anchors[0];

        const planned = scoreTowerPlacement({
          grid,
          position: firstPlanned,
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
          mazeSkeleton,
        });

        const unplanned = scoreTowerPlacement({
          grid,
          position: { x: 0, y: 0 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
          mazeSkeleton,
        });

        expect(planned.skeletonScore).toBeGreaterThan(0);
        expect(unplanned.skeletonScore).toBe(0);
        expect(planned.totalScore).toBeGreaterThan(unplanned.totalScore);
      });

      it('rejects a wall that would seal the field', () => {
        const gapColumn = 4;
        const gapRow = 7;
        const grid = createTestGrid();
        // A two-cell wall with a two-cell gap that one tower block would plug.
        const walled = {
          ...grid,
          cells: grid.cells.map((cell) =>
            (cell.x === gapColumn || cell.x === gapColumn + 1) &&
            cell.y !== gapRow &&
            cell.y !== gapRow + 1
              ? { ...cell, isOccupied: true, isWalkable: false }
              : cell,
          ),
        };
        const pathProbe = createPathProbe(walled);

        const result = scoreTowerPlacement({
          grid: walled,
          position: { x: gapColumn, y: gapRow },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: findPathBfs(walled).path,
          pathProbe,
        });

        expect(result.isValid).toBe(false);
        expect(result.invalidReason).toBe('blocks_path');
      });

      it('rejects a wall that leaves only a one-cell gap, with or without a probe', () => {
        const grid = createTestGrid();
        // Columns 4..5 walled except rows 6..8; a block at (4, 6) leaves row 8 alone.
        const walled = {
          ...grid,
          cells: grid.cells.map((cell) =>
            (cell.x === 4 || cell.x === 5) && (cell.y < 6 || cell.y > 8)
              ? { ...cell, isOccupied: true, isWalkable: false }
              : cell,
          ),
        };
        const input = {
          grid: walled,
          position: { x: 4, y: 6 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: findPathBfs(walled).path,
        };

        const probed = scoreTowerPlacement({ ...input, pathProbe: createPathProbe(walled) });
        const unprobed = scoreTowerPlacement(input);

        expect(probed.invalidReason).toBe('blocks_path');
        expect(unprobed.invalidReason).toBe('blocks_path');
      });

      it('rejects a wall that seals the field by touching another wall at a corner', () => {
        const grid = createTestGrid();
        const walled = {
          ...grid,
          cells: grid.cells.map((cell) =>
            ((cell.x === 4 || cell.x === 5) && cell.y <= 4) ||
            ((cell.x === 6 || cell.x === 7) && cell.y >= 7)
              ? { ...cell, isOccupied: true, isWalkable: false }
              : cell,
          ),
        };

        const result = scoreTowerPlacement({
          grid: walled,
          position: { x: 4, y: 5 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path: findPathBfs(walled).path,
          pathProbe: createPathProbe(walled),
        });

        expect(result.invalidReason).toBe('blocks_path');
      });

      it('prefers extending a wall over dropping an isolated tower', () => {
        const grid = createTestGrid();
        const withWall = {
          ...grid,
          cells: grid.cells.map((cell) =>
            cell.x === 4 && cell.y === 0 ? { ...cell, isOccupied: true, isWalkable: false } : cell,
          ),
        };
        const pathProbe = createPathProbe(withWall);
        const path = findPathBfs(withWall).path;

        const extending = scoreTowerPlacement({
          grid: withWall,
          position: { x: 4, y: 1 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
        });

        const isolated = scoreTowerPlacement({
          grid: withWall,
          position: { x: 7, y: 1 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
          pathProbe,
        });

        expect(extending.wallSynergyScore).toBeGreaterThan(isolated.wallSynergyScore);
      });
    });

    describe('defense proximity scoring', () => {
      it('gives higher score for positions near existing towers', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const existingTower = createTestTower({ x: 3, y: 5 });

        const nearTower = scoreTowerPlacement({
          grid,
          position: { x: 4, y: 5 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [existingTower],
          path,
        });

        const farFromTower = scoreTowerPlacement({
          grid,
          position: { x: 8, y: 12 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [existingTower],
          path,
        });

        expect(nearTower.defenseProximityScore).toBeGreaterThan(farFromTower.defenseProximityScore);
      });

      it('gives neutral score when no towers exist', () => {
        const grid = createTestGrid();
        const path = getTestPath();

        const result = scoreTowerPlacement({
          grid,
          position: { x: 5, y: 5 },
          towerType: TowerTypeId.SINGLE,
          existingTowers: [],
          path,
        });

        expect(result.defenseProximityScore).toBe(0.5);
      });
    });

    describe('determinism', () => {
      it('returns identical score for identical inputs', () => {
        const grid = createTestGrid();
        const path = getTestPath();
        const tower = createTestTower({ x: 3, y: 5 });

        const input = {
          grid,
          position: { x: 4, y: 6 },
          towerType: TowerTypeId.SINGLE as TowerTypeId,
          existingTowers: [tower],
          path,
        };

        const result1 = scoreTowerPlacement(input);
        const result2 = scoreTowerPlacement(input);

        expect(result1).toEqual(result2);
      });
    });
  });

  describe('scoreAllPlacements', () => {
    it('returns scores sorted by totalScore descending', () => {
      const grid = createTestGrid();
      const path = getTestPath();

      const positions = [
        { x: 1, y: 1 },
        { x: 5, y: 7 },
        { x: 8, y: 12 },
        { x: 3, y: 5 },
      ];

      const scores = scoreAllPlacements({
        grid,
        towerType: TowerTypeId.SINGLE,
        positions,
        existingTowers: [],
        path,
      });

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1].totalScore).toBeGreaterThanOrEqual(scores[i].totalScore);
      }
    });

    it('filters out invalid positions from valid results', () => {
      const grid = createTestGrid();
      const path = getTestPath();

      const positions = [ENTRANCE, EXIT, { x: 1, y: 1 }, { x: 5, y: 7 }];

      const scores = scoreAllPlacements({
        grid,
        towerType: TowerTypeId.SINGLE,
        positions,
        existingTowers: [],
        path,
      });

      const validScores = scores.filter((s) => s.isValid);
      const invalidScores = scores.filter((s) => !s.isValid);

      expect(validScores.length).toBe(2);
      expect(invalidScores.length).toBe(2);
    });

    it('returns empty array for empty positions', () => {
      const grid = createTestGrid();
      const path = getTestPath();

      const scores = scoreAllPlacements({
        grid,
        towerType: TowerTypeId.SINGLE,
        positions: [],
        existingTowers: [],
        path,
      });

      expect(scores).toEqual([]);
    });

    it('is deterministic for equal inputs', () => {
      const grid = createTestGrid();
      const path = getTestPath();
      const tower = createTestTower({ x: 3, y: 5 });

      const positions = [
        { x: 1, y: 1 },
        { x: 5, y: 7 },
        { x: 4, y: 5 },
      ];

      const input = {
        grid,
        towerType: TowerTypeId.SINGLE as TowerTypeId,
        positions,
        existingTowers: [tower],
        path,
      };

      const scores1 = scoreAllPlacements(input);
      const scores2 = scoreAllPlacements(input);

      expect(scores1).toEqual(scores2);
    });
  });
});
