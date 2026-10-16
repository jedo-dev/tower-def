import { describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../../shared/types/content-ids';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import {
  BETWEEN_LANES_ANCHOR,
  FROST_TYPE,
  ledgerTower,
  OFF_ROUTE_ANCHOR,
  SPLASH_TYPE,
  STRAIGHT_ANCHOR,
  SUPPORT_TYPE,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damagePlacementFixtures';
import { createRouteDamageLedger } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';
import { computeTargetsPerShot } from './shotReach';
import { computeSampleDamageRate, computeShotDps } from './towerDamageModel';

const geometry = createRouteGeometry(U_TURN_ROUTE);
const range = WALL_TYPE.stats.range;

describe('entities/computer-opponent/damage-placement route geometry', () => {
  it('counts both passes of a block between two lanes', () => {
    const between = geometry.coveredSamples(BETWEEN_LANES_ANCHOR, range).length;
    const straight = geometry.coveredSamples(STRAIGHT_ANCHOR, range).length;

    expect(straight).toBeGreaterThan(0);
    expect(between).toBeGreaterThanOrEqual(2 * straight - 2);
    expect(geometry.coveredSamples(OFF_ROUTE_ANCHOR, range)).toHaveLength(0);
  });

  it('sees more neighbours where a lane runs next to another one', () => {
    const counts = geometry.neighbourCounts(3);
    const onUpperLane = U_TURN_ROUTE.findIndex((cell) => cell.x === 8 && cell.y === 2);
    const onStraight = U_TURN_ROUTE.findIndex((cell) => cell.x === 0 && cell.y === 20);

    expect(counts[onUpperLane]).toBeGreaterThan(counts[onStraight]);
  });
});

describe('entities/computer-opponent/damage-placement tower damage model', () => {
  it('rates a single-target tower at its shot damage per second', () => {
    const tower = ledgerTower(STRAIGHT_ANCHOR);
    const sample = geometry.coveredSamples(STRAIGHT_ANCHOR, range)[0];

    expect(computeSampleDamageRate(tower, geometry, sample)).toBeCloseTo(
      computeShotDps(WALL_TYPE.stats),
    );
  });

  it('expects a splash to hit more than one creep on a crowded route', () => {
    const splash = ledgerTower(STRAIGHT_ANCHOR, SPLASH_TYPE);
    const sample = geometry.coveredSamples(STRAIGHT_ANCHOR, SPLASH_TYPE.stats.range)[0];

    expect(computeTargetsPerShot(splash, geometry, sample)).toBeGreaterThan(1);
  });

  it('adds poison ticks on top of the poison tower shots', () => {
    const poison = {
      anchor: STRAIGHT_ANCHOR,
      towerType: TowerTypeId.POISON,
      stats: { ...TOWER_COMBAT_STATS_BY_TYPE[TowerTypeId.POISON] },
    };
    const sample = geometry.coveredSamples(STRAIGHT_ANCHOR, poison.stats.range)[0];

    expect(computeSampleDamageRate(poison, geometry, sample)).toBeGreaterThan(
      computeShotDps(poison.stats),
    );
  });

  it('gives an aura tower no damage of its own', () => {
    const support = ledgerTower(STRAIGHT_ANCHOR, SUPPORT_TYPE);

    expect(computeSampleDamageRate(support, geometry, 0)).toBe(0);
  });
});

describe('entities/computer-opponent/damage-placement route damage ledger', () => {
  it('values a tower between two lanes about twice one beside a straight', () => {
    const ledger = createRouteDamageLedger(geometry);
    const between = ledger.contributionOf(ledgerTower(BETWEEN_LANES_ANCHOR));
    const straight = ledger.contributionOf(ledgerTower(STRAIGHT_ANCHOR));

    expect(between).toBeGreaterThan(1.8 * straight);
    expect(ledger.contributionOf(ledgerTower(OFF_ROUTE_ANCHOR))).toBe(0);
  });

  it('values a frost tower by the damage downstream of it', () => {
    const empty = createRouteDamageLedger(geometry);
    const guarded = createRouteDamageLedger(geometry, [
      ledgerTower({ x: 1, y: 23 }),
      ledgerTower({ x: 1, y: 26 }),
    ]);
    const frost = ledgerTower(STRAIGHT_ANCHOR, FROST_TYPE);

    expect(guarded.contributionOf(frost)).toBeGreaterThan(empty.contributionOf(frost));
  });

  it('does not let a second frost re-slow what the first already chills', () => {
    const frost = ledgerTower(STRAIGHT_ANCHOR, FROST_TYPE);
    const towers = [ledgerTower({ x: 1, y: 23 }), ledgerTower({ x: 1, y: 26 })];
    const withoutFrost = createRouteDamageLedger(geometry, towers);
    const withFrost = createRouteDamageLedger(geometry, [...towers, frost]);

    expect(withFrost.contributionOf(frost)).toBeLessThan(withoutFrost.contributionOf(frost));
  });

  it('values a support tower by the towers in its aura, never stacking auras', () => {
    const neighbours = [ledgerTower({ x: 1, y: 17 }), ledgerTower({ x: 1, y: 23 })];
    const support = ledgerTower(STRAIGHT_ANCHOR, SUPPORT_TYPE);
    const lonely = createRouteDamageLedger(geometry);
    const crowded = createRouteDamageLedger(geometry, neighbours);
    const supported = createRouteDamageLedger(geometry, [...neighbours, support]);

    expect(lonely.contributionOf(support)).toBe(0);
    expect(crowded.contributionOf(support)).toBeGreaterThan(0);
    expect(supported.contributionOf(ledgerTower({ x: 3, y: 20 }, SUPPORT_TYPE))).toBe(0);
  });

  it('raises the mean damage per route sample as towers are added', () => {
    const ledger = createRouteDamageLedger(geometry);
    const before = ledger.averageSampleDps();
    ledger.add(ledgerTower(BETWEEN_LANES_ANCHOR));

    expect(before).toBe(0);
    expect(ledger.averageSampleDps()).toBeGreaterThan(0);
  });
});
