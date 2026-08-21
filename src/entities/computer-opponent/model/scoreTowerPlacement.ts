import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { TowerAttackKind, TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerEntity } from '../../tower/model/types';
import {
  getTowerArchetype,
  getTowerAttackKind,
  TOWER_COMBAT_STATS_BY_TYPE,
} from '../../tower/model/types';
import { validateTowerPlacementPath } from '../../../shared/lib/pathfinding/validateTowerPlacementPath';

export type PlacementScore = {
  position: GridPosition;
  towerType: TowerTypeId;
  pathCoverageScore: number;
  defenseProximityScore: number;
  /** How much this archetype is worth given what the field already has. */
  archetypeValueScore: number;
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

/**
 * How much the opponent values each archetype before composition is taken into
 * account. Control towers are worth slightly more than raw damage because they
 * multiply everything else on the field.
 */
const ARCHETYPE_BASE_VALUE: Record<TowerTypeId, number> = {
  [TowerTypeId.SINGLE]: 1,
  [TowerTypeId.SPLASH]: 1.05,
  [TowerTypeId.FROST]: 1.15,
  [TowerTypeId.POISON]: 1.1,
  [TowerTypeId.CHAIN]: 1.05,
  [TowerTypeId.SUPPORT]: 0.9,
};

/** Bonus for the first crowd control tower on a field that has none. */
const FIRST_CONTROL_TOWER_BONUS = 1.6;
/** Each copy of an archetype makes the next one less attractive. */
const REPEAT_ARCHETYPE_PENALTY = 0.35;
/** A support tower is only worth it once there is something worth buffing. */
const MIN_DAMAGE_TOWERS_PER_SUPPORT = 3;

function isControlArchetype(towerType: TowerTypeId): boolean {
  return getTowerArchetype(towerType).onHitEffects.length > 0;
}

function isSupportArchetype(towerType: TowerTypeId): boolean {
  return getTowerAttackKind(towerType) === TowerAttackKind.AURA;
}

function computeArchetypeValueScore(
  towerType: TowerTypeId,
  existingTowers: readonly TowerEntity[],
): number {
  const sameArchetypeCount = existingTowers.filter((tower) => tower.type === towerType).length;
  const damageTowerCount = existingTowers.filter((tower) => !isSupportArchetype(tower.type)).length;
  const supportCount = existingTowers.length - damageTowerCount;

  if (isSupportArchetype(towerType)) {
    // Never let the opponent stack support towers it has nothing to buff.
    const allowedSupportCount = Math.floor(damageTowerCount / MIN_DAMAGE_TOWERS_PER_SUPPORT);
    if (supportCount >= allowedSupportCount) {
      return 0;
    }
  }

  let value = ARCHETYPE_BASE_VALUE[towerType];

  const hasControlTower = existingTowers.some((tower) => isControlArchetype(tower.type));
  if (!hasControlTower && isControlArchetype(towerType) && existingTowers.length > 0) {
    value *= FIRST_CONTROL_TOWER_BONUS;
  }

  return value / (1 + REPEAT_ARCHETYPE_PENALTY * sameArchetypeCount);
}

function countTowersInAuraRadius(
  position: GridPosition,
  towerType: TowerTypeId,
  existingTowers: readonly TowerEntity[],
): number {
  const aura = getTowerArchetype(towerType).aura;

  if (!aura) {
    return 0;
  }

  return existingTowers.filter(
    (tower) => !isSupportArchetype(tower.type)
      && euclideanDistance(position, tower.position) <= aura.radiusCells,
  ).length;
}

function computePathCoverageScore(
  position: GridPosition,
  towerType: TowerTypeId,
  path: readonly GridPosition[],
  existingTowers: readonly TowerEntity[],
): number {
  // A support tower covers towers, not path: score it by what it would buff.
  if (isSupportArchetype(towerType)) {
    const damageTowerCount = existingTowers.filter(
      (tower) => !isSupportArchetype(tower.type),
    ).length;

    if (damageTowerCount === 0) {
      return 0;
    }

    return countTowersInAuraRadius(position, towerType, existingTowers) / damageTowerCount;
  }

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
      archetypeValueScore: 0,
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
      archetypeValueScore: 0,
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
      archetypeValueScore: 0,
      totalScore: 0,
      isValid: false,
      invalidReason: 'blocks_path',
    };
  }

  const pathCoverageScore = computePathCoverageScore(position, towerType, path, existingTowers);
  const defenseProximityScore = computeDefenseProximityScore(position, existingTowers);
  const archetypeValueScore = computeArchetypeValueScore(towerType, existingTowers);

  const totalScore = (pathCoverageScore * 0.7 + defenseProximityScore * 0.3) * archetypeValueScore;

  return {
    position,
    towerType,
    pathCoverageScore,
    defenseProximityScore,
    archetypeValueScore,
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
