import { describe, expect, it } from 'vitest';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { getCellAt } from '../../../shared/lib/grid/getCellAt';
import type { GridModel, GridPoint } from '../../../shared/types/grid';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { createInitialDuelMatchState, payIncome, type DuelMatchState } from '../../duel-match';
import { applyComputerBuildStrategy } from './applyComputerBuildStrategy';
import { buildDecisionContext } from './buildDecisionContext';
import {
  createPlannedRoute,
  createRouteDamageLedger,
  createRouteGeometry,
  toLedgerTowers,
  type RouteGeometry,
} from './damage-placement';
import { createMazeEvaluator } from './maze-evaluation';
import type { MazePlan } from './maze-planning';

const ROUNDS = 16;

type TowerOnBoard = DuelMatchState['opponent']['battlefield']['towers'][number];

/** A tower built in some round, with the route the finished plan would make that round. */
type Placement = { tower: TowerOnBoard; plannedRoute: RouteGeometry };

function isBuiltAt(grid: GridModel, anchor: GridPoint): boolean {
  return [0, 1].every((dy) =>
    [0, 1].every((dx) => getCellAt(grid, anchor.x + dx, anchor.y + dy)?.isOccupied === true),
  );
}

/** Build phases on seed 1 with the maze plan carried over, as the maze sim plays them. */
function playBuildRounds(
  seed: number,
  rounds: number,
): { state: DuelMatchState; placements: Placement[] } {
  let state = createInitialDuelMatchState(
    RaceId.UNDEAD,
    RaceId.UNDEAD,
    generateEdgeEndpoints(seed),
  );
  let plan: MazePlan | null = null;
  const placements: Placement[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    if (round > 1) {
      const paid = payIncome(state).state;
      state = { ...paid, round: paid.round + 1, phase: 'build' };
    }
    const context = buildDecisionContext({
      matchState: state,
      difficulty: Difficulty.HARD,
      leakHistory: [],
    });
    const before = state.opponent.battlefield;
    const result = applyComputerBuildStrategy({ state, context, mazePlan: plan });
    plan = result.mazePlan;
    state = result.state;
    // The route the round's towers were placed against: the whole plan built.
    const unbuilt = (plan?.anchors ?? []).filter((anchor) => !isBuiltAt(before.grid, anchor));
    const plannedRoute = createPlannedRoute(before.grid, unbuilt).geometry;
    const builtIds = new Set(before.towers.map((tower) => tower.id));
    for (const tower of state.opponent.battlefield.towers) {
      if (!builtIds.has(tower.id)) {
        placements.push({ tower, plannedRoute });
      }
    }
  }
  return { state, placements };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

describe('entities/computer-opponent damage placement in play', () => {
  const { state, placements } = playBuildRounds(1, ROUNDS);
  const { grid, towers } = state.opponent.battlefield;
  const geometry = createRouteGeometry(
    createMazeEvaluator(grid, grid.entrance, grid.exit).routes.smallRoute,
  );
  const coverageOf = (tower: (typeof towers)[number]) =>
    geometry.coveredSamples(tower.position, tower.combatStats.range).length;
  const walls = towers.filter((tower) => tower.type === TowerTypeId.SINGLE && tower.level === 1);
  const areaTowers = towers.filter(
    (tower) => tower.type === TowerTypeId.SPLASH || tower.type === TowerTypeId.CHAIN,
  );
  /** More route in range than one straight pass can bring: a turn or a second lane. */
  const seesRouteTwice = ({ tower, plannedRoute }: Placement) =>
    plannedRoute.coveredSamples(tower.position, tower.combatStats.range).length >
    2 * Math.floor(tower.combatStats.range) + 1;
  const isAreaTower = (tower: TowerOnBoard) =>
    tower.type === TowerTypeId.SPLASH || tower.type === TowerTypeId.CHAIN;

  it('mixes area damage towers into the maze walls', () => {
    expect(walls.length).toBeGreaterThan(0);
    expect(areaTowers.length).toBeGreaterThan(0);
  });

  it('puts area damage where creeps pass twice: turns and the gap between lanes', () => {
    // Judged against the route of the plan the tower was built for: a later
    // plan extension may reroute the creeps past a tower that stands already.
    const areaPlacements = placements.filter(({ tower }) => isAreaTower(tower));
    expect(areaPlacements.length).toBeGreaterThan(0);
    for (const placement of areaPlacements) {
      const { tower } = placement;
      const where = `${tower.type} at ${tower.position.x},${tower.position.y}`;
      expect(seesRouteTwice(placement), where).toBe(true);
    }
    expect(mean(areaTowers.map(coverageOf))).toBeGreaterThan(mean(walls.map(coverageOf)));
  });

  it('upgrades towers that add more damage along the route than the average wall', () => {
    const ledger = createRouteDamageLedger(geometry, toLedgerTowers(towers));
    const contributionOf = (tower: (typeof towers)[number]) => {
      const index = towers.indexOf(tower);
      return ledger.contributionOf(ledger.towers[index], index);
    };
    const upgraded = towers.filter((tower) => tower.level > 1);

    expect(upgraded.length).toBeGreaterThan(0);
    expect(mean(upgraded.map(contributionOf))).toBeGreaterThan(mean(walls.map(contributionOf)));
  });

  it('plays the same match every time', () => {
    expect(playBuildRounds(1, 6).state.opponent.battlefield.towers).toEqual(
      playBuildRounds(1, 6).state.opponent.battlefield.towers,
    );
  });
});
