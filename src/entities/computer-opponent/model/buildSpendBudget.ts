import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { buildableTowers } from '../../tower/model/config/buildableTowers';

export type SpendBudgetConfig = {
  maxSpendRatioPerRound: number;
  /**
   * Towers per round. The player has no such cap, so this is purely the
   * difficulty dial; set too low it starves the maze once income takes off,
   * because gold piles up faster than the opponent is allowed to spend it.
   */
  maxBuildActionsPerRound: number;
  minGoldReserveRatio: number;
  /**
   * Share of the field the opponent keeps walling before it switches from
   * growing the maze to upgrading what it already has.
   */
  mazeCoverageTarget: number;
};

export const SPEND_BUDGET_BY_DIFFICULTY: Readonly<Record<Difficulty, Readonly<SpendBudgetConfig>>> =
  {
    [Difficulty.EASY]: {
      maxSpendRatioPerRound: 0.4,
      maxBuildActionsPerRound: 2,
      minGoldReserveRatio: 0.35,
      mazeCoverageTarget: 0.25,
    },
    [Difficulty.NORMAL]: {
      maxSpendRatioPerRound: 0.6,
      maxBuildActionsPerRound: 4,
      minGoldReserveRatio: 0.25,
      mazeCoverageTarget: 0.34,
    },
    [Difficulty.HARD]: {
      maxSpendRatioPerRound: 0.85,
      maxBuildActionsPerRound: 6,
      minGoldReserveRatio: 0.15,
      mazeCoverageTarget: 0.42,
    },
    [Difficulty.NIGHTMARE]: {
      maxSpendRatioPerRound: 0.95,
      maxBuildActionsPerRound: 8,
      minGoldReserveRatio: 0.1,
      mazeCoverageTarget: 0.46,
    },
  };

export function computeSpendBudget(gold: number, difficulty: Difficulty): number {
  const config = SPEND_BUDGET_BY_DIFFICULTY[difficulty];
  const reserveGold = Math.floor(gold * config.minGoldReserveRatio);
  const ratioBudget = Math.floor(gold * config.maxSpendRatioPerRound);
  const reserveBudget = Math.max(0, gold - reserveGold);
  return Math.min(ratioBudget, reserveBudget);
}

/** Build price of a tower type for a race; null when the race cannot build it. */
export function getTowerCostForType(towerType: TowerTypeId, raceId: RaceId): number | null {
  const registry = getRaceRegistry(raceId);
  for (const buildableId of registry.buildableTowerIds) {
    const config = buildableTowers.find((tower) => tower.id === buildableId);
    if (config && config.towerType === towerType) {
      return config.costGold;
    }
  }
  return null;
}

/** Every tower type the race can build, in registry order, without repeats. */
export function getRaceTowerTypes(raceId: RaceId): TowerTypeId[] {
  const types: TowerTypeId[] = [];
  for (const buildableId of getRaceRegistry(raceId).buildableTowerIds) {
    const config = buildableTowers.find((tower) => tower.id === buildableId);
    if (config && !types.includes(config.towerType)) {
      types.push(config.towerType);
    }
  }
  return types;
}

/** Price of the cheapest tower the race can build at all; null when it builds none. */
export function getCheapestTowerCost(raceId: RaceId): number | null {
  const registry = getRaceRegistry(raceId);
  let cheapest: number | null = null;
  for (const buildableId of registry.buildableTowerIds) {
    const config = buildableTowers.find((tower) => tower.id === buildableId);
    if (config && config.costGold > 0 && (cheapest === null || config.costGold < cheapest)) {
      cheapest = config.costGold;
    }
  }
  return cheapest;
}

export type PricedTowerType = { towerType: TowerTypeId; cost: number };

/**
 * Cheapest affordable tower type within `budget`. Maze walls are plain
 * blocks: a cheap tower walls a cell as well as a pricey one.
 */
export function findCheapestAffordableTower(
  towerTypes: readonly TowerTypeId[],
  raceId: RaceId,
  budget: number,
): PricedTowerType | null {
  let cheapest: PricedTowerType | null = null;
  for (const towerType of towerTypes) {
    const cost = getTowerCostForType(towerType, raceId);
    if (cost === null || cost <= 0 || cost > budget) {
      continue;
    }
    if (cheapest === null || cost < cheapest.cost) {
      cheapest = { towerType, cost };
    }
  }
  return cheapest;
}
