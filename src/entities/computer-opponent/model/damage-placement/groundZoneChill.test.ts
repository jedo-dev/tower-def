import { describe, expect, it } from 'vitest';
import { DamageType, EffectId, UnitMoveType } from '../../../../shared/types/content-ids';
import type { TowerGroundZone } from '../../../tower/model/abilities';
import type { TowerOnHitEffect } from '../../../tower/model/types';
import {
  FROST_TYPE,
  ledgerTower,
  STRAIGHT_ANCHOR,
  U_TURN_ROUTE,
  WALL_TYPE,
} from './damagePlacementFixtures';
import { computeGroundZoneChillWindow, NO_ZONE_CHILL } from './deferredMechanicsValue';
import { createRouteDamageLedger } from './routeDamageLedger';
import { createRouteGeometry } from './routeGeometry';
import { combineOwnSlowGains, slowTimeGain } from './slowGain';
import type { LedgerTower } from './routeDamageLedger';

// A ground zone's chill valued like an on-hit chill (tower-def-02k.13).

const geometry = createRouteGeometry(U_TURN_ROUTE);
const covered = geometry.coveredSamples(STRAIGHT_ANCHOR, FROST_TYPE.stats.range);
const TAR: TowerGroundZone = {
  radiusCells: 2,
  durationMs: 4_000,
  tickMs: 500,
  damage: 0,
  damageType: DamageType.MAGICAL,
  chill: 0.65,
};
const SHOT_CHILL: TowerOnHitEffect[] = [
  { effectId: EffectId.CHILL, magnitude: 0.55, durationMs: 2_000 },
];

function tarPit(zone: TowerGroundZone | undefined, anchor = STRAIGHT_ANCHOR): LedgerTower {
  const tower = ledgerTower(anchor, FROST_TYPE);
  return {
    ...tower,
    stats: {
      ...tower.stats,
      onHitEffects: SHOT_CHILL,
      ...(zone ? { abilities: { groundZone: zone } } : {}),
    },
  };
}

/** Walls along the straight below the frost block: the damage a slow stretches. */
function wallsAlongStraight(): LedgerTower[] {
  return [16, 18, 22, 24].map((y) => ledgerTower({ x: 1, y }, WALL_TYPE));
}

describe('ground zone chill window', () => {
  it('is nothing without a chill, off the ground lane or out of reach', () => {
    const plain = { groundZone: { ...TAR, chill: undefined } };
    expect(computeGroundZoneChillWindow(plain, geometry, covered, 1)).toEqual(NO_ZONE_CHILL);
    expect(
      computeGroundZoneChillWindow({ groundZone: TAR }, geometry, covered, 1, UnitMoveType.AIR),
    ).toEqual(NO_ZONE_CHILL);
    expect(computeGroundZoneChillWindow({ groundZone: TAR }, geometry, [], 1)).toEqual(
      NO_ZONE_CHILL,
    );
  });

  it('lies where the lead creep leaves the reach, widened by the radius', () => {
    const window = computeGroundZoneChillWindow({ groundZone: TAR }, geometry, covered, 1);
    const last = covered[covered.length - 1];

    expect(window.magnitude).toBe(0.65);
    expect(window.to).toBe(last + 2);
    expect(window.from).toBeGreaterThan(covered[0]);
    expect(window.from).toBeLessThanOrEqual(last - 2);
  });

  it('reaches more of the wave the more zones lie at once, at most all of it', () => {
    const brief = { groundZone: { ...TAR, durationMs: 500 } };
    const rare = computeGroundZoneChillWindow(brief, geometry, covered, 0.5).share;
    const often = computeGroundZoneChillWindow(brief, geometry, covered, 1).share;

    expect(rare).toBeGreaterThan(0);
    expect(often).toBeCloseTo(rare * 2);
    expect(computeGroundZoneChillWindow({ groundZone: TAR }, geometry, covered, 2).share).toBe(1);
  });
});

describe('own slow gains', () => {
  it('is the shot chill on its share alone without a zone', () => {
    expect(combineOwnSlowGains(0.4, 1.2, 0, 0)).toBeCloseTo(0.48);
  });

  it('counts the stronger slow once where both reach a creep', () => {
    expect(combineOwnSlowGains(1, 1, 1, 2)).toBe(2);
    expect(combineOwnSlowGains(0.5, 1, 1, 2)).toBe(2);
    expect(combineOwnSlowGains(0.5, 2, 0.5, 1)).toBeCloseTo(0.5 * 2 + 0.5 * 0.5 * 1);
  });

  it('caps a deep zone like a deep shot chill', () => {
    expect(slowTimeGain(0.75)).toBe(slowTimeGain(0.7));
  });
});

describe('route damage ledger with a chilling ground zone', () => {
  function contribution(tower: LedgerTower, others: LedgerTower[] = wallsAlongStraight()): number {
    return createRouteDamageLedger(geometry, others).contributionOf(tower);
  }

  it('values the zone chill on top of the shot chill', () => {
    expect(contribution(tarPit(TAR))).toBeGreaterThan(contribution(tarPit(undefined)));
  });

  it('values a deeper zone chill more, up to the slow cap', () => {
    const shallow = contribution(tarPit({ ...TAR, chill: 0.6 }));
    const deep = contribution(tarPit({ ...TAR, chill: 0.7 }));
    const deeper = contribution(tarPit({ ...TAR, chill: 0.75 }));

    expect(deep).toBeGreaterThan(shallow);
    expect(deeper).toBeCloseTo(deep);
  });

  it('adds only the rest of the wave for a zone no stronger than the shot', () => {
    const plain = contribution(tarPit(undefined));
    const same = contribution(tarPit({ ...TAR, chill: 0.55 }));
    const stronger = contribution(tarPit(TAR));

    expect(same).toBeGreaterThan(plain);
    expect(stronger).toBeGreaterThan(same);
  });

  it('is nothing on the air lane', () => {
    const air = createRouteDamageLedger(geometry, wallsAlongStraight(), UnitMoveType.AIR);
    expect(air.contributionOf(tarPit(TAR))).toBeCloseTo(air.contributionOf(tarPit(undefined)));
  });

  it("reads another tower's zone as a slow already held", () => {
    const zoneOnly = (zone: TowerGroundZone): LedgerTower => {
      const tower = tarPit(zone, { x: 1, y: 21 });
      return { ...tower, stats: { ...tower.stats, onHitEffects: [] } };
    };
    const besideZone = contribution(tarPit(undefined), [
      ...wallsAlongStraight(),
      zoneOnly({ ...TAR, chill: 0.75 }),
    ]);
    const besideZoneless = contribution(tarPit(undefined), [
      ...wallsAlongStraight(),
      zoneOnly({ ...TAR, chill: undefined, damage: 1 }),
    ]);

    expect(besideZone).toBeLessThan(besideZoneless);
  });
});
