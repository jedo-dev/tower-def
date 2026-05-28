import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../tower/model/types';
import { validateTowerPlacementPath } from '../../../shared/lib/pathfinding/validateTowerPlacementPath';

export type PlacementScore = {
  position: GridPosition;
  towerType: TowerTypeId;
  pathCoverageScore: number;
  defenseProximityScore: number;
  totalScore: number;
  isValid: boolean;
  invalidReason?: 'blocks_path' | 'entrance_or_exit' | 'occupied';
};

type ScorePlacementInput = {
  grid: GridModel;
  position: GridPosition;
  towerType: TowerTypeId;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
};

function euclideanDistance(a: GridPosition, b: GridPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isEntranceOrExit(grid: GridModel, position: GridPosition): boolean {
  return (
    (position.x === grid.entrance.x && position.y === grid.entrance.y) ||
    (position.x === grid.exit.x && position.y === grid.exit.y)
  );
}

function isOccupied(grid: GridModel, position: GridPosition): boolean {
  const cell = grid.cells.find((c) => c.x === position.x && c.y === position.y);
  return cell?.isOccupied ?? true;
}

function countPathCellsInRange(
  position: GridPosition,
  range: number,
  path: readonly GridPosition[],
): number {
  let count = 0;
  for (const pathCell of path) {
    if (euclideanDistance(position, pathCell) <= range) {
      count += 1;
    }
  }
  return count;
}

function computeAverageDistanceToTowers(
  position: GridPosition,
  towers: readonly TowerEntity[],
): number {
  if (towers.length === 0) {
    return 0;
  }

  let totalDistance = 0;
  for (const tower of towers) {
    totalDistance += euclideanDistance(position, tower.position);
  }

  return totalDistance / towers.length;
}

function computePathCoverageScore(
  position: GridPosition,
  towerType: TowerTypeId,
  path: readonly GridPosition[],
): number {
  const stats = TOWER_COMBAT_STATS_BY_TYPE[towerType];
  if (!stats) {
    return 0;
  }

  const cellsInRange = countPathCellsInRange(position, stats.range, path);
  if (path.length === 0) {
    return 0;
  }

  return cellsInRange / path.length;
}

function computeDefenseProximityScore(
  position: GridPosition,
  existingTowers: readonly TowerEntity[],
): number {
  if (existingTowers.length === 0) {
    return 0.5;
  }

  const avgDistance = computeAverageDistanceToTowers(position, existingTowers);
  const maxReasonableDistance = 10;

  return Math.max(0, 1 - avgDistance / maxReasonableDistance);
}

export function scoreTowerPlacement(input: ScorePlacementInput): PlacementScore {
  const { grid, position, towerType, existingTowers, path } = input;

  if (isEntranceOrExit(grid, position)) {
    return {
      position,
      towerType,
      pathCoverageScore: 0,
      defenseProximityScore: 0,
      totalScore: 0,
      isValid: false,
      invalidReason: 'entrance_or_exit',
    };
  }

  if (isOccupied(grid, position)) {
    return {
      position,
      towerType,
      pathCoverageScore: 0,
      defenseProximityScore: 0,
      totalScore: 0,
      isValid: false,
      invalidReason: 'occupied',
    };
  }

  const pathPreserved = validateTowerPlacementPath(grid, position);
  if (!pathPreserved) {
    return {
      position,
      towerType,
      pathCoverageScore: 0,
      defenseProximityScore: 0,
      totalScore: 0,
      isValid: false,
      invalidReason: 'blocks_path',
    };
  }

  const pathCoverageScore = computePathCoverageScore(position, towerType, path);
  const defenseProximityScore = computeDefenseProximityScore(position, existingTowers);

  const totalScore = pathCoverageScore * 0.7 + defenseProximityScore * 0.3;

  return {
    position,
    towerType,
    pathCoverageScore,
    defenseProximityScore,
    totalScore,
    isValid: true,
  };
}

type ScoreAllPositionsInput = {
  grid: GridModel;
  towerType: TowerTypeId;
  positions: readonly GridPosition[];
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
};

export function scoreAllPlacements(input: ScoreAllPositionsInput): PlacementScore[] {
  const { grid, towerType, positions, existingTowers, path } = input;

  const scores: PlacementScore[] = [];
  for (const position of positions) {
    scores.push(scoreTowerPlacement({ grid, position, towerType, existingTowers, path }));
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}
