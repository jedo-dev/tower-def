import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../entities/difficulty';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { RaceId } from '../../../shared/types/content-ids';
import type { GridPoint } from '../../../shared/types/grid';
import {
  simulateMazeBuildRounds,
  type MazeRouteCost,
  type MazeSimulationResult,
} from './simulateMazeBuildRounds';

// The classic lane (entrance left-middle, exit right-middle) is the map the
// game plays without dynamic entrances. Its shortest possible empty route made
// every full-height wall cost 14 towers, so the planner once built one wall
// and stalled for the rest of the opening (tower-def-oui).

const RACE = RaceId.UNDEAD;
const CHECK_ROUND = 8;
const SEED_RANGE = Array.from({ length: 10 }, (_, index) => index + 1);
const GOLD_UNIT = 100;
/** Every block priced as the cheapest tower: what walling it costs at least. */
const WALL_PRICE = Math.min(...getBuildableTowersByFaction(RACE).map((tower) => tower.costGold));
/** A turn must swing the route back by at least this many cells; smaller wiggles do not count. */
const MIN_TURN_SWING = 4;
const MIN_TURNS = 2;

function simulate(seed: number | null): MazeSimulationResult {
  return simulateMazeBuildRounds({
    rounds: CHECK_ROUND,
    difficulty: Difficulty.HARD,
    raceId: RACE,
    seed,
  });
}

function totalCost(cost: MazeRouteCost): number {
  return (cost.small ?? 0) + (cost.large ?? 0);
}

/** Route cost (both routes, over the empty board) bought per 100 gold of walls. */
function routePerHundredWallGold(result: MazeSimulationResult): number {
  const report = result.rounds[CHECK_ROUND - 1];
  const wallGold = result.rounds.reduce((sum, round) => sum + round.builtCount * WALL_PRICE, 0);
  const gain = totalCost(report.routeCost) - totalCost(result.initialRouteCost);
  return (gain / wallGold) * GOLD_UNIT;
}

/** Times the route reverses along one axis by at least `MIN_TURN_SWING` cells. */
function countReversals(values: readonly number[]): number {
  let reversals = 0;
  let direction = 0;
  let extreme = values[0] ?? 0;
  for (const value of values) {
    const swing = value - extreme;
    if (direction === 0 && Math.abs(swing) >= MIN_TURN_SWING) {
      direction = Math.sign(swing);
      extreme = value;
    } else if (direction !== 0 && Math.sign(swing) === direction) {
      extreme = value;
    } else if (direction !== 0 && Math.abs(swing) >= MIN_TURN_SWING) {
      reversals += 1;
      direction = -direction;
      extreme = value;
    }
  }
  return reversals;
}

function countTurns(route: readonly GridPoint[]): number {
  return countReversals(route.map((cell) => cell.x)) + countReversals(route.map((cell) => cell.y));
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

describe('features/maze-simulation search planner on the classic lane', () => {
  const classic = simulate(null);

  it('counts a single U-turn round one wall as one turn', () => {
    const uTurn = [
      ...Array.from({ length: 10 }, (_, y) => ({ x: 5, y: 14 + y })),
      ...Array.from({ length: 10 }, (_, y) => ({ x: 9, y: 23 - y })),
    ];
    expect(countTurns(uTurn)).toBe(1);
  });

  it('winds the route into a serpentine with at least two turns by round 8', () => {
    expect(countTurns(classic.rounds[CHECK_ROUND - 1].battlefield.path)).toBeGreaterThanOrEqual(
      MIN_TURNS,
    );
  });

  it('buys at least the generated-map median route per wall gold by round 8', () => {
    const seededMedian = median(SEED_RANGE.map((seed) => routePerHundredWallGold(simulate(seed))));

    expect(routePerHundredWallGold(classic)).toBeGreaterThanOrEqual(seededMedian);
  });
});
