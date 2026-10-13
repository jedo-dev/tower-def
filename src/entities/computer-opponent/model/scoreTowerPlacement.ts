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
import type { PathProbe } from '../../../shared/lib/pathfinding/createPathProbe';
import type { MazeSkeleton } from './createMazeSkeleton';

export type PlacementScore = {
  position: GridPosition;
  towerType: TowerTypeId;
  pathCoverageScore: number;
  defenseProximityScore: number;
  /** How much this archetype is worth given what the field already has. */
  archetypeValueScore: number;
  /** Cells this placement adds to the shortest route through the field. */
  mazeGainCells: number;
  /** Saturated form of `mazeGainCells`, comparable with the other scores. */
  mazeGainScore: number;
  /** Rewards extending an existing wall over dropping an isolated tower. */
  wallSynergyScore: number;
  /** How early this cell appears in the planned maze comb; 0 when off-plan. */
  skeletonScore: number;
  totalScore: number;
  isValid: boolean;
  invalidReason?: 'blocks_path' | 'entrance_or_exit' | 'occupied';
};

/**
 * Relative pull of each placement term. The opponent plays a maze game: making
 * creeps walk further is worth as much as shooting them, because a longer route
 * multiplies the damage every existing tower deals.
 */
export type PlacementWeights = {
  pathCoverage: number;
  mazeGain: number;
  wallSynergy: number;
  defenseProximity: number;
  skeleton: number;
};

/** Default stance: follow the maze plan, cover the route it creates. */
export const MAZE_PLACEMENT_WEIGHTS: PlacementWeights = {
  skeleton: 0.5,
  mazeGain: 0.2,
  pathCoverage: 0.2,
  wallSynergy: 0.06,
  defenseProximity: 0.04,
};

/** Under pressure, firepower on the current route matters more than length. */
export const DEFENSE_PLACEMENT_WEIGHTS: PlacementWeights = {
  skeleton: 0.28,
  mazeGain: 0.14,
  pathCoverage: 0.44,
  wallSynergy: 0.06,
  defenseProximity: 0.08,
};

/**
 * Cells of detour that count as "half a great placement". Saturating instead of
 * clamping keeps a 20-cell detour ranked above a 10-cell one.
 */
const MAZE_GAIN_HALF_VALUE_CELLS = 6;

/**
 * A wall grows one cell at a time. Exactly one blocked orthogonal neighbour
 * means this cell extends a wall; three or more means it is plugging a pocket,
 * which costs a tower and lengthens nothing.
 */
const WALL_SYNERGY_BY_BLOCKED_NEIGHBORS: readonly number[] = [0.2, 1, 0.7, 0.15, 0];

type ScorePlacementInput = {
  grid: GridModel;
  position: GridPosition;
  towerType: TowerTypeId;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
  /** Supplies maze metrics and the rerouted path. Without it both stay neutral. */
  pathProbe?: PathProbe;
  /** The comb the opponent is filling in. Without it the term stays neutral. */
  mazeSkeleton?: MazeSkeleton;
  weights?: PlacementWeights;
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

function isCellBlocked(
  grid: GridModel,
  position: GridPosition,
  pathProbe: PathProbe | undefined,
): boolean {
  if (pathProbe) {
    return pathProbe.isBlocked(position);
  }

  if (position.x < 0 || position.x >= grid.cols || position.y < 0 || position.y >= grid.rows) {
    return true;
  }

  const cell = grid.cells.find((c) => c.x === position.x && c.y === position.y);
  return !cell || !cell.isWalkable || cell.isOccupied;
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
    (tower) =>
      !isSupportArchetype(tower.type) &&
      euclideanDistance(position, tower.position) <= aura.radiusCells,
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

function computeMazeGainScore(gainCells: number): number {
  if (gainCells <= 0) {
    return 0;
  }

  return gainCells / (gainCells + MAZE_GAIN_HALF_VALUE_CELLS);
}

function computeWallSynergyScore(
  grid: GridModel,
  position: GridPosition,
  pathProbe: PathProbe | undefined,
): number {
  const neighbors: readonly GridPosition[] = [
    { x: position.x + 1, y: position.y },
    { x: position.x - 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x, y: position.y - 1 },
  ];

  let blockedNeighbors = 0;
  for (const neighbor of neighbors) {
    if (isCellBlocked(grid, neighbor, pathProbe)) {
      blockedNeighbors += 1;
    }
  }

  return WALL_SYNERGY_BY_BLOCKED_NEIGHBORS[blockedNeighbors] ?? 0;
}

function createInvalidScore(
  position: GridPosition,
  towerType: TowerTypeId,
  invalidReason: NonNullable<PlacementScore['invalidReason']>,
): PlacementScore {
  return {
    position,
    towerType,
    pathCoverageScore: 0,
    defenseProximityScore: 0,
    archetypeValueScore: 0,
    mazeGainCells: 0,
    mazeGainScore: 0,
    wallSynergyScore: 0,
    skeletonScore: 0,
    totalScore: 0,
    isValid: false,
    invalidReason,
  };
}

export function scoreTowerPlacement(input: ScorePlacementInput): PlacementScore {
  const { grid, position, towerType, existingTowers, path, pathProbe, mazeSkeleton } = input;
  const weights = input.weights ?? MAZE_PLACEMENT_WEIGHTS;

  if (isEntranceOrExit(grid, position)) {
    return createInvalidScore(position, towerType, 'entrance_or_exit');
  }

  if (isOccupied(grid, position)) {
    return createInvalidScore(position, towerType, 'occupied');
  }

  const probeResult = pathProbe?.probe(position);
  const pathPreserved = probeResult
    ? probeResult.path !== null
    : validateTowerPlacementPath(grid, position);
  if (!pathPreserved) {
    return createInvalidScore(position, towerType, 'blocks_path');
  }

  // Score the route the creeps would actually walk once this tower stands, not
  // the one they walk today: a wall that reroutes them elsewhere is worthless
  // if the tower cannot reach the new route.
  const effectivePath = probeResult?.path ?? path;
  const mazeGainCells =
    probeResult && pathProbe ? Math.max(0, probeResult.length - pathProbe.baseLength) : 0;

  const pathCoverageScore = computePathCoverageScore(
    position,
    towerType,
    effectivePath,
    existingTowers,
  );
  const defenseProximityScore = computeDefenseProximityScore(position, existingTowers);
  const archetypeValueScore = computeArchetypeValueScore(towerType, existingTowers);
  const mazeGainScore = computeMazeGainScore(mazeGainCells);
  const wallSynergyScore = computeWallSynergyScore(grid, position, pathProbe);
  const skeletonScore = mazeSkeleton?.priorityOf(position) ?? 0;

  const totalScore =
    (pathCoverageScore * weights.pathCoverage +
      mazeGainScore * weights.mazeGain +
      wallSynergyScore * weights.wallSynergy +
      defenseProximityScore * weights.defenseProximity +
      skeletonScore * weights.skeleton) *
    archetypeValueScore;

  return {
    position,
    towerType,
    pathCoverageScore,
    defenseProximityScore,
    archetypeValueScore,
    mazeGainCells,
    mazeGainScore,
    wallSynergyScore,
    skeletonScore,
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
  pathProbe?: PathProbe;
  mazeSkeleton?: MazeSkeleton;
  weights?: PlacementWeights;
};

export function scoreAllPlacements(input: ScoreAllPositionsInput): PlacementScore[] {
  const { grid, towerType, positions, existingTowers, path, pathProbe, mazeSkeleton, weights } =
    input;

  const scores: PlacementScore[] = [];
  for (const position of positions) {
    scores.push(
      scoreTowerPlacement({
        grid,
        position,
        towerType,
        existingTowers,
        path,
        pathProbe,
        mazeSkeleton,
        weights,
      }),
    );
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}
