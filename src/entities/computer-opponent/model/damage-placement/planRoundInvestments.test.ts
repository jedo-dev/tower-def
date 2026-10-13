import { describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../../shared/types/content-ids';
import { getTowerStatsForLevel } from '../../../tower/model/upgrade';
import {
  BETWEEN_LANES_ANCHOR,
  FROST_TYPE,
  ledgerTower,
  OFF_ROUTE_ANCHOR,
  SPLASH_TYPE,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damagePlacementFixtures';
import {
  planRoundInvestments,
  type RoundInvestmentInput,
  type UpgradeCandidate,
} from './planRoundInvestments';
import { createRouteDamageLedger, type LedgerTower } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';

const UPGRADE_COST = 40;
const LEVEL_TWO_SINGLE = getTowerStatsForLevel(TowerTypeId.SINGLE, 2);

function upgradeOf(towerId: string, ledgerIndex: number): UpgradeCandidate {
  if (!LEVEL_TWO_SINGLE) {
    throw new Error('single tower has no level 2');
  }
  return { towerId, ledgerIndex, cost: UPGRADE_COST, nextStats: LEVEL_TWO_SINGLE };
}

function createInput(
  overrides: Partial<RoundInvestmentInput>,
  standing: readonly LedgerTower[] = [],
): RoundInvestmentInput {
  return {
    ledger: createRouteDamageLedger(createRouteGeometry(U_TURN_ROUTE), standing),
    wall: WALL_TYPE,
    damageTypes: [FROST_TYPE, SPLASH_TYPE],
    walls: [],
    upgrades: [],
    budget: 0,
    maxBuilds: 4,
    ...overrides,
  };
}

describe('entities/computer-opponent/damage-placement planRoundInvestments', () => {
  it('puts the damage tower on the block between two lanes, the wall on the straight', () => {
    // Plan order lists the straight block first; the extra gold buys one upgrade of a block.
    const plan = planRoundInvestments(
      createInput({
        walls: [
          { anchor: STRAIGHT_ANCHOR, routeGain: 2 },
          { anchor: BETWEEN_LANES_ANCHOR, routeGain: 2 },
        ],
        budget: 2 * WALL_TYPE.cost + (SPLASH_TYPE.cost - WALL_TYPE.cost),
      }),
    );

    expect(plan.builds.map((build) => build.anchor)).toEqual([
      STRAIGHT_ANCHOR,
      BETWEEN_LANES_ANCHOR,
    ]);
    expect(plan.builds[0].towerType).toBe(WALL_TYPE.towerType);
    expect(plan.builds[1].towerType).not.toBe(WALL_TYPE.towerType);
    expect(plan.spent).toBeLessThanOrEqual(2 * WALL_TYPE.cost + SPLASH_TYPE.cost - WALL_TYPE.cost);
  });

  it('spends the upgrade on the tower that covers the route most', () => {
    const standing = [ledgerTower(STRAIGHT_ANCHOR), ledgerTower(BETWEEN_LANES_ANCHOR)];
    const plan = planRoundInvestments(
      createInput(
        { upgrades: [upgradeOf('straight', 0), upgradeOf('between', 1)], budget: UPGRADE_COST },
        standing,
      ),
    );

    expect(plan.upgrades.map((upgrade) => upgrade.towerId)).toEqual(['between']);
    expect(plan.spent).toBe(UPGRADE_COST);
  });

  it('orders several upgrades by the damage they add per gold', () => {
    const standing = [
      ledgerTower(OFF_ROUTE_ANCHOR),
      ledgerTower(STRAIGHT_ANCHOR),
      ledgerTower(BETWEEN_LANES_ANCHOR),
    ];
    const plan = planRoundInvestments(
      createInput(
        {
          upgrades: [upgradeOf('off', 0), upgradeOf('straight', 1), upgradeOf('between', 2)],
          budget: 10 * UPGRADE_COST,
        },
        standing,
      ),
    );

    // A tower off the route gains nothing from a level and is never upgraded.
    expect(plan.upgrades.map((upgrade) => upgrade.towerId)).toEqual(['between', 'straight']);
  });

  it('grows the maze before upgrading when the next block adds real route', () => {
    const plan = planRoundInvestments(
      createInput(
        {
          walls: [{ anchor: OFF_ROUTE_ANCHOR, routeGain: 12 }],
          upgrades: [upgradeOf('straight', 0)],
          budget: WALL_TYPE.cost,
        },
        [ledgerTower(STRAIGHT_ANCHOR)],
      ),
    );

    expect(plan.builds).toHaveLength(1);
    expect(plan.upgrades).toHaveLength(0);
  });

  it('upgrades instead of buying a block that adds no route and covers nothing', () => {
    const plan = planRoundInvestments(
      createInput(
        {
          walls: [{ anchor: OFF_ROUTE_ANCHOR, routeGain: 0 }],
          upgrades: [upgradeOf('between', 0)],
          budget: WALL_TYPE.cost,
        },
        [ledgerTower(BETWEEN_LANES_ANCHOR)],
      ),
    );

    expect(plan.builds).toHaveLength(0);
    expect(plan.upgrades.map((upgrade) => upgrade.towerId)).toEqual(['between']);
  });

  it('respects the budget, the build allowance and the upgrade allowance', () => {
    const plan = planRoundInvestments(
      createInput(
        {
          walls: [
            { anchor: STRAIGHT_ANCHOR, routeGain: 4 },
            { anchor: BETWEEN_LANES_ANCHOR, routeGain: 4 },
            { anchor: { x: 1, y: 10 }, routeGain: 4 },
          ],
          upgrades: [upgradeOf('a', 0), upgradeOf('b', 1)],
          budget: 1_000,
          maxBuilds: 2,
          maxUpgrades: 1,
        },
        [ledgerTower({ x: 1, y: 14 }), ledgerTower({ x: 4, y: 3 })],
      ),
    );

    expect(plan.builds).toHaveLength(2);
    expect(plan.upgrades).toHaveLength(1);
    const spent =
      plan.builds.reduce((sum, build) => sum + build.cost, 0) +
      plan.upgrades.reduce((sum, upgrade) => sum + upgrade.cost, 0);
    expect(plan.spent).toBe(spent);
    expect(plan.spent).toBeLessThanOrEqual(1_000);
  });

  it('builds nothing without a wall type but still upgrades', () => {
    const plan = planRoundInvestments(
      createInput(
        {
          wall: null,
          walls: [{ anchor: STRAIGHT_ANCHOR, routeGain: 10 }],
          upgrades: [upgradeOf('between', 0)],
          budget: 100,
        },
        [ledgerTower(BETWEEN_LANES_ANCHOR)],
      ),
    );

    expect(plan.builds).toHaveLength(0);
    expect(plan.upgrades).toHaveLength(1);
  });

  it('is deterministic', () => {
    const run = () =>
      planRoundInvestments(
        createInput(
          {
            walls: [
              { anchor: STRAIGHT_ANCHOR, routeGain: 3 },
              { anchor: BETWEEN_LANES_ANCHOR, routeGain: 1 },
            ],
            upgrades: [upgradeOf('a', 0)],
            budget: 260,
          },
          [ledgerTower({ x: 1, y: 12 })],
        ),
      );

    expect(run()).toEqual(run());
  });
});
