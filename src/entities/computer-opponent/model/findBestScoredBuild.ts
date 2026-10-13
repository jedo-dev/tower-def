import { getCellAt } from '../../../shared/lib/grid/getCellAt';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { getTowerCostForType } from './buildSpendBudget';
import type { PathProbe, PathProbeResult } from './createPathProbe';
import type { MazeEvaluator } from './maze-evaluation';
import type { MazePlanPriority } from './maze-planning';
import { scoreTowerPlacement, type PlacementWeights } from './scoreTowerPlacement';
import { classifyTowerFootprint } from './towerPlacementGeometry';
import type { BuildAction, DecisionContext } from './types';

/**
 * Route-cutting candidates a defending opponent probes with a route search
 * per tower, best screened first. Every probe re-searches the small route
 * (about as many cells as the free board on a grown maze), so probing all of
 * them cost ~50,000 expansions per tower; the top few by screened score are
 * where the winner almost always is. Six missed it once a defender kept
 * walling its maze plan (seed 4, round 11 of the defending test).
 */
export const DEFEND_REROUTE_PROBE_LIMIT = 8;

export type FindBestScoredBuildInput = {
  context: DecisionContext;
  /** The board with every tower chosen so far; `evaluator` must hold the same blocks. */
  grid: GridModel;
  evaluator: MazeEvaluator;
  mazePlan: MazePlanPriority;
  weights: PlacementWeights;
  existingTowers: readonly TowerEntity[];
  budget: number;
  excludedPositions: readonly GridPosition[];
  /**
   * Most candidates on the current small route to probe with a route search,
   * best screened score first; the rest are skipped. Infinity probes them all,
   * which scores every candidate exactly.
   */
  rerouteProbeLimit: number;
};

export type ScoredBuild = BuildAction & {
  /** Small-route cost the tower adds, in cells. */
  routeGain: number;
};

type PricedTower = { towerType: TowerTypeId; cost: number };

type ScoredCandidate = PricedTower & {
  position: GridPosition;
  typeIndex: number;
  positionIndex: number;
  valuePerGold: number;
  routeGain: number;
};

type RouteCuttingCandidate = { position: GridPosition; positionIndex: number; screened: number };

const SEALED: PathProbeResult = Object.freeze({ path: null, cost: 0, gain: 0 });

function collectPricedTowers(context: DecisionContext, budget: number): PricedTower[] {
  const priced: PricedTower[] = [];
  for (const towerType of context.affordableTowers) {
    const cost = getTowerCostForType(towerType, context.raceId);
    if (cost !== null && cost > 0 && cost <= budget) {
      priced.push({ towerType, cost });
    }
  }
  return priced;
}

/** Highest value per gold first; ties go to the earlier tower type, then the earlier anchor. */
function compareCandidates(a: ScoredCandidate, b: ScoredCandidate): number {
  return (
    b.valuePerGold - a.valuePerGold ||
    a.typeIndex - b.typeIndex ||
    a.positionIndex - b.positionIndex
  );
}

/**
 * Best single tower by placement score per gold: route coverage, maze gain,
 * wall synergy and the maze plan, weighted by the current stance. Used when
 * defending, and whenever the maze plan has nothing buildable to offer.
 *
 * A block off the current small route leaves that route as it is, so its
 * score needs no route search. A block on it is screened against the current
 * route first, then the best `rerouteProbeLimit` of those are probed for the
 * route they force. Only the winner is checked against the large route.
 */
export function findBestScoredBuild(input: FindBestScoredBuildInput): ScoredBuild | null {
  const { context, grid, evaluator, mazePlan, weights, existingTowers } = input;
  const { smallRoute, smallRouteCost } = evaluator.routes;
  const pricedTowers = collectPricedTowers(context, input.budget);
  // A sealed field takes no tower: nothing could keep it legal.
  if (smallRoute === null || smallRouteCost === null || pricedTowers.length === 0) {
    return null;
  }

  const excluded = new Set(input.excludedPositions.map(({ x, y }) => `${x}:${y}`));
  const candidates = context.availableBuildPositions.filter(
    (position) =>
      !excluded.has(`${position.x}:${position.y}`) &&
      classifyTowerFootprint(grid, position) === null,
  );

  const basePath = smallRoute;
  const baseCost = smallRouteCost;
  const unchangedRoute: PathProbeResult = { path: basePath, cost: baseCost, gain: 0 };

  function toPathProbe(result: PathProbeResult): PathProbe {
    return {
      basePath,
      baseCost,
      probeFootprint: () => result,
      isBlocked(position: GridPosition): boolean {
        const cell = getCellAt(grid, position.x, position.y);
        return !cell || !cell.isWalkable || cell.isOccupied;
      },
      get expandedNodeCount() {
        return evaluator.expandedNodeCount;
      },
    };
  }

  /** Scores one anchor for every priced tower type against the route in `result`. */
  function scoreAnchor(position: GridPosition, positionIndex: number, result: PathProbeResult) {
    const pathProbe = toPathProbe(result);
    return pricedTowers.map(({ towerType, cost }, typeIndex): ScoredCandidate | null => {
      const score = scoreTowerPlacement({
        grid,
        position,
        towerType,
        existingTowers,
        path: basePath,
        pathProbe,
        mazePlan,
        weights,
      });
      // Value per gold, not raw value: a cheap tower walls a cell just as well
      // as a pricey one, so raw scores would overpay for every brick.
      return score.isValid && score.totalScore > 0
        ? {
            towerType,
            cost,
            position,
            typeIndex,
            positionIndex,
            valuePerGold: score.totalScore / cost,
            routeGain: score.mazeGainCells,
          }
        : null;
    });
  }

  const scored: ScoredCandidate[] = [];
  const keep = (entries: readonly (ScoredCandidate | null)[]) => {
    for (const entry of entries) {
      if (entry) scored.push(entry);
    }
  };

  // Off the route the screened score is the exact one.
  const routeCutting: RouteCuttingCandidate[] = [];
  candidates.forEach((position, positionIndex) => {
    const screened = scoreAnchor(position, positionIndex, unchangedRoute);
    if (!evaluator.touchesSmallRoute(position)) {
      keep(screened);
      return;
    }
    const best = Math.max(0, ...screened.map((entry) => entry?.valuePerGold ?? 0));
    routeCutting.push({ position, positionIndex, screened: best });
  });

  routeCutting.sort((a, b) => b.screened - a.screened || a.positionIndex - b.positionIndex);
  for (const { position, positionIndex } of routeCutting.slice(0, input.rerouteProbeLimit)) {
    const probe = evaluator.probeSmallRoute(position);
    const result: PathProbeResult =
      probe.valid && probe.smallRoute
        ? { path: probe.smallRoute, cost: baseCost + probe.smallGain, gain: probe.smallGain }
        : SEALED;
    keep(scoreAnchor(position, positionIndex, result));
  }

  scored.sort(compareCandidates);
  const largeRouteOpen = new Map<number, boolean>();
  for (const candidate of scored) {
    let isOpen = largeRouteOpen.get(candidate.positionIndex);
    if (isOpen === undefined) {
      isOpen = evaluator.keepsLargeRouteOpen(candidate.position);
      largeRouteOpen.set(candidate.positionIndex, isOpen);
    }
    if (isOpen) {
      const { towerType, position, routeGain } = candidate;
      return { kind: 'build', towerType, position, routeGain };
    }
  }
  return null;
}
