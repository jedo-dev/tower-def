import type {
  DamageType,
  TowerTargetScope,
  TowerTypeId,
} from '../../../../shared/types/content-ids';
import type { GridPoint } from '../../../../shared/types/grid';
import type { TowerCombatStats } from '../../../tower/model/types';
import {
  MIN_INVESTMENT_VALUE_PER_GOLD,
  MIN_ROUTE_CELL_VALUE_IN_WALL_DPS,
  ROUTE_GAIN_VALUE_WEIGHT,
} from './constants';
import type { LedgerTower, RouteDamageLedger } from './routeDamageLedger';
import { computeEffectiveShotDps } from './towerDamageModel';

/**
 * A tower type the opponent can build, priced for its race, with its level 1
 * stats and the race's authored target scope (the archetype's when absent).
 */
export type InvestmentTowerType = {
  towerType: TowerTypeId;
  cost: number;
  stats: TowerCombatStats;
  allowedTargets?: TowerTargetScope;
  /** The race's authored damage type; the archetype's when absent. */
  damageType?: DamageType;
};

/** An unbuilt maze plan block, in build order, with the route cells building it adds. */
export type PlanWallCandidate = {
  anchor: GridPoint;
  routeGain: number;
};

/** A standing tower that can go up a level; `ledgerIndex` is its place in the ledger. */
export type UpgradeCandidate = {
  towerId: string;
  ledgerIndex: number;
  cost: number;
  nextStats: TowerCombatStats;
};

export type RoundInvestmentInput = {
  /** Damage along the route the finished plan will make, standing towers included. */
  ledger: RouteDamageLedger;
  /** The cheapest affordable tower, what a plan block is walled with by default; null builds nothing. */
  wall: InvestmentTowerType | null;
  /** Pricier types a plan block may get instead, when the extra gold pays. */
  damageTypes: readonly InvestmentTowerType[];
  walls: readonly PlanWallCandidate[];
  upgrades: readonly UpgradeCandidate[];
  budget: number;
  maxBuilds: number;
  /** Upgrades allowed this round; unlimited when omitted. */
  maxUpgrades?: number;
};

export type PlannedBuild = {
  anchor: GridPoint;
  towerType: TowerTypeId;
  cost: number;
  routeGain: number;
};

export type PlannedUpgrade = { towerId: string; cost: number; value: number };

export type RoundInvestmentPlan = {
  /** In plan order, each with the type it ended up with. */
  builds: PlannedBuild[];
  upgrades: PlannedUpgrade[];
  spent: number;
};

type Option = { value: number; cost: number; apply: () => void };

type BuildChoice = PlannedBuild & { ledgerIndex: number };

function toLedgerTower(anchor: GridPoint, type: InvestmentTowerType): LedgerTower {
  return {
    anchor,
    towerType: type.towerType,
    stats: type.stats,
    ...(type.allowedTargets === undefined ? {} : { allowedTargets: type.allowedTargets }),
    ...(type.damageType === undefined ? {} : { damageType: type.damageType }),
  };
}

/**
 * Splits one round's budget between growing the maze, putting real damage on
 * the blocks that see the route most, and upgrading what already stands, by
 * marginal value per gold: a wall is worth the route it adds (at the field's
 * current firepower per cell) plus its own damage; turning a wall into a
 * damage tower is worth the extra damage at that block over the extra price;
 * an upgrade is worth the extra damage of the next level over its price.
 * Greedy and deterministic: ties keep walls first, then plan order.
 */
export function planRoundInvestments(input: RoundInvestmentInput): RoundInvestmentPlan {
  const { ledger, wall, damageTypes, walls, upgrades } = input;
  const builds: BuildChoice[] = [];
  const plannedUpgrades: PlannedUpgrade[] = [];
  const upgradedIds = new Set<string>();
  const maxUpgrades = input.maxUpgrades ?? Infinity;
  const buildLimit = wall ? Math.min(input.maxBuilds, walls.length) : 0;
  const minRouteCellValue = wall
    ? MIN_ROUTE_CELL_VALUE_IN_WALL_DPS * computeEffectiveShotDps(wall, ledger.efficiency)
    : 0;
  let remaining = input.budget;

  function collectBuildOptions(wallType: InvestmentTowerType, options: Option[]): void {
    const routeCellValue =
      Math.max(minRouteCellValue, ledger.averageSampleDps()) * ROUTE_GAIN_VALUE_WEIGHT;

    if (builds.length < buildLimit) {
      const next = walls[builds.length];
      const tower = toLedgerTower(next.anchor, wallType);
      options.push({
        value: next.routeGain * routeCellValue + ledger.contributionOf(tower),
        cost: wallType.cost,
        apply: () => {
          const ledgerIndex = ledger.add(tower);
          builds.push({ ...next, towerType: wallType.towerType, cost: wallType.cost, ledgerIndex });
        },
      });
    }

    for (const build of builds) {
      if (build.towerType !== wallType.towerType) {
        continue;
      }
      const base = ledger.contributionOf(toLedgerTower(build.anchor, wallType), build.ledgerIndex);
      for (const type of damageTypes) {
        if (type.cost <= wallType.cost) {
          continue;
        }
        const tower = toLedgerTower(build.anchor, type);
        options.push({
          value: ledger.contributionOf(tower, build.ledgerIndex) - base,
          cost: type.cost - wallType.cost,
          apply: () => {
            ledger.replace(build.ledgerIndex, tower);
            build.towerType = type.towerType;
            build.cost = type.cost;
          },
        });
      }
    }
  }

  function collectOptions(): Option[] {
    const options: Option[] = [];
    if (wall) {
      collectBuildOptions(wall, options);
    }

    if (plannedUpgrades.length < maxUpgrades) {
      for (const upgrade of upgrades) {
        if (upgradedIds.has(upgrade.towerId)) {
          continue;
        }
        const current = ledger.towers[upgrade.ledgerIndex];
        const next: LedgerTower = { ...current, stats: upgrade.nextStats };
        const value =
          ledger.contributionOf(next, upgrade.ledgerIndex) -
          ledger.contributionOf(current, upgrade.ledgerIndex);
        options.push({
          value,
          cost: upgrade.cost,
          apply: () => {
            ledger.replace(upgrade.ledgerIndex, next);
            upgradedIds.add(upgrade.towerId);
            plannedUpgrades.push({ towerId: upgrade.towerId, cost: upgrade.cost, value });
          },
        });
      }
    }

    return options;
  }

  for (;;) {
    let best: Option | null = null;
    let bestRatio = MIN_INVESTMENT_VALUE_PER_GOLD;
    for (const option of collectOptions()) {
      if (option.cost <= 0 || option.cost > remaining) {
        continue;
      }
      const ratio = option.value / option.cost;
      if (ratio > bestRatio) {
        best = option;
        bestRatio = ratio;
      }
    }
    if (!best) {
      break;
    }
    best.apply();
    remaining -= best.cost;
  }

  return {
    builds: builds.map(({ ledgerIndex: _ledgerIndex, ...build }) => build),
    upgrades: plannedUpgrades,
    spent: input.budget - remaining,
  };
}
