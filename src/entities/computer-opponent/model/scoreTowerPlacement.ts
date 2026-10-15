import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  canTargetScopeHitMoveType,
  UnitMoveType,
  type TowerTargetScope,
  type TowerTypeId,
} from '../../../shared/types/content-ids';
import type { TowerCombatStats, TowerEntity } from '../../tower/model/types';
import {
  getTowerArchetype,
  resolveTowerTargetScope,
  TOWER_COMBAT_STATS_BY_TYPE,
} from '../../tower/model/types';
import { getTowerCenter } from '../../tower/model/footprint';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { getFootprintCenter } from '../../../shared/lib/grid/footprint';
import { validateFootprintPlacementPath } from '../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { PathProbe } from './createPathProbe';
import type { MazePlanPriority } from './maze-planning';
import { computeArchetypeValueScore, isSupportArchetype } from './archetypeValueScore';
import {
  classifyTowerFootprint,
  computeWallSynergyScore,
  type FootprintBlockReason,
} from './towerPlacementGeometry';

export type PlacementScore = {
  /** Top-left anchor of the 2x2 tower block. */
  position: GridPosition;
  towerType: TowerTypeId;
  pathCoverageScore: number;
  defenseProximityScore: number;
  /** How much this archetype is worth given what the field already has. */
  archetypeValueScore: number;
  /** Octile cost this placement adds to the small creep route through the field. */
  mazeGainCells: number;
  /** Saturated form of `mazeGainCells`, comparable with the other scores. */
  mazeGainScore: number;
  /** Rewards extending an existing wall over dropping an isolated tower. */
  wallSynergyScore: number;
  /** How early this block comes in the maze plan; 0 when off-plan. */
  planScore: number;
  totalScore: number;
  isValid: boolean;
  invalidReason?: 'blocks_path' | FootprintBlockReason;
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
  plan: number;
};

/** Default stance: follow the maze plan, cover the route it creates. */
export const MAZE_PLACEMENT_WEIGHTS: PlacementWeights = {
  plan: 0.5,
  mazeGain: 0.2,
  pathCoverage: 0.2,
  wallSynergy: 0.06,
  defenseProximity: 0.04,
};

/** Under pressure, firepower on the current route matters more than length. */
export const DEFENSE_PLACEMENT_WEIGHTS: PlacementWeights = {
  plan: 0.28,
  mazeGain: 0.14,
  pathCoverage: 0.44,
  wallSynergy: 0.06,
  defenseProximity: 0.08,
};

/**
 * Surplus firepower once the maze is finished: nothing but how much of the
 * route a tower covers. Built off the route only, so it never moves away
 * from the towers already standing.
 */
export const COVERAGE_PLACEMENT_WEIGHTS: PlacementWeights = {
  plan: 0,
  mazeGain: 0,
  pathCoverage: 1,
  wallSynergy: 0,
  defenseProximity: 0,
};

/**
 * Cells of detour that count as "half a great placement". Saturating instead of
 * clamping keeps a 20-cell detour ranked above a 10-cell one.
 */
const MAZE_GAIN_HALF_VALUE_CELLS = 12;

type ScorePlacementInput = {
  grid: GridModel;
  position: GridPosition;
  towerType: TowerTypeId;
  existingTowers: readonly TowerEntity[];
  path: readonly GridPosition[];
  /** Supplies maze metrics and the rerouted path. Without it both stay neutral. */
  pathProbe?: PathProbe;
  /** The maze plan the opponent is filling in. Without it the term stays neutral. */
  mazePlan?: MazePlanPriority;
  weights?: PlacementWeights;
  /** The straight air line fliers take; coverage of it counts when `airThreatShare` > 0. */
  airPath?: readonly GridPosition[];
  /** Share of the next wave's health that flies (0..1); 0 or absent ignores the air line. */
  airThreatShare?: number;
  /** The race's authored target scope for `towerType`; the archetype's when absent. */
  allowedTargets?: TowerTargetScope;
  /** The race's authored level 1 stats for `towerType`; the archetype's when absent. */
  combatStats?: TowerCombatStats;
};

function euclideanDistance(a: GridPosition, b: GridPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
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
    totalDistance += euclideanDistance(position, getTowerCenter(tower));
  }

  return totalDistance / towers.length;
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
      euclideanDistance(position, getTowerCenter(tower)) <= aura.radiusCells,
  ).length;
}

/** Share of `path` a tower of `towerType` at `position` reaches; 0 when its scope cannot shoot that lane. */
function computeLaneCoverage(
  position: GridPosition,
  range: number,
  scope: TowerTargetScope,
  path: readonly GridPosition[],
  moveType: UnitMoveType,
): number {
  if (path.length === 0 || !canTargetScopeHitMoveType(scope, moveType)) {
    return 0;
  }
  return countPathCellsInRange(position, range, path) / path.length;
}

/**
 * Route coverage over both lanes: the ground route, and the air line weighted
 * by the share of the wave that flies. A ground-only tower scores nothing on
 * the air lane, so with fliers coming an anti-air type wins the same block.
 */
function computePathCoverageScore(
  position: GridPosition,
  towerType: TowerTypeId,
  range: number,
  scope: TowerTargetScope,
  path: readonly GridPosition[],
  existingTowers: readonly TowerEntity[],
  airPath: readonly GridPosition[] | undefined,
  airThreatShare: number,
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

  const ground = computeLaneCoverage(position, range, scope, path, UnitMoveType.GROUND);
  if (!airPath || airThreatShare <= 0) {
    return ground;
  }
  const share = Math.min(1, airThreatShare);
  const air = computeLaneCoverage(position, range, scope, airPath, UnitMoveType.AIR);
  return (1 - share) * ground + share * air;
}

function computeDefenseProximityScore(
  position: GridPosition,
  existingTowers: readonly TowerEntity[],
): number {
  if (existingTowers.length === 0) {
    return 0.5;
  }

  const avgDistance = computeAverageDistanceToTowers(position, existingTowers);
  const maxReasonableDistance = 20;

  return Math.max(0, 1 - avgDistance / maxReasonableDistance);
}

function computeMazeGainScore(gainCells: number): number {
  if (gainCells <= 0) {
    return 0;
  }

  return gainCells / (gainCells + MAZE_GAIN_HALF_VALUE_CELLS);
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
    planScore: 0,
    totalScore: 0,
    isValid: false,
    invalidReason,
  };
}

export function scoreTowerPlacement(input: ScorePlacementInput): PlacementScore {
  const { grid, position, towerType, existingTowers, path, pathProbe, mazePlan } = input;
  const airThreatShare = input.airThreatShare ?? 0;
  const weights = input.weights ?? MAZE_PLACEMENT_WEIGHTS;

  const footprintBlockReason = classifyTowerFootprint(grid, position);
  if (footprintBlockReason) {
    return createInvalidScore(position, towerType, footprintBlockReason);
  }

  const probeResult = pathProbe?.probeFootprint(position, TOWER_FOOTPRINT);
  const pathPreserved = probeResult
    ? probeResult.path !== null
    : validateFootprintPlacementPath(grid, position, TOWER_FOOTPRINT);
  if (!pathPreserved) {
    return createInvalidScore(position, towerType, 'blocks_path');
  }

  // Score the route the creeps would actually walk once this tower stands, not
  // the one they walk today: a wall that reroutes them elsewhere is worthless
  // if the tower cannot reach the new route.
  const effectivePath = probeResult?.path ?? path;
  const mazeGainCells = probeResult ? Math.max(0, probeResult.gain) : 0;

  // Range, coverage and spacing are measured from the middle of the block.
  const center = getFootprintCenter(position, TOWER_FOOTPRINT);
  const pathCoverageScore = computePathCoverageScore(
    center,
    towerType,
    (input.combatStats ?? TOWER_COMBAT_STATS_BY_TYPE[towerType]).range,
    resolveTowerTargetScope({ type: towerType, allowedTargets: input.allowedTargets }),
    effectivePath,
    existingTowers,
    input.airPath,
    airThreatShare,
  );
  const defenseProximityScore = computeDefenseProximityScore(center, existingTowers);
  const archetypeValueScore = computeArchetypeValueScore(towerType, existingTowers);
  const mazeGainScore = computeMazeGainScore(mazeGainCells);
  const wallSynergyScore = computeWallSynergyScore(grid, position, pathProbe);
  const planScore = mazePlan?.priorityOf(position) ?? 0;

  const totalScore =
    (pathCoverageScore * weights.pathCoverage +
      mazeGainScore * weights.mazeGain +
      wallSynergyScore * weights.wallSynergy +
      defenseProximityScore * weights.defenseProximity +
      planScore * weights.plan) *
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
    planScore,
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
  mazePlan?: MazePlanPriority;
  weights?: PlacementWeights;
  airPath?: readonly GridPosition[];
  airThreatShare?: number;
};

export function scoreAllPlacements(input: ScoreAllPositionsInput): PlacementScore[] {
  const { grid, towerType, positions, existingTowers, path, pathProbe, mazePlan, weights } = input;

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
        mazePlan,
        weights,
        airPath: input.airPath,
        airThreatShare: input.airThreatShare,
      }),
    );
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}
