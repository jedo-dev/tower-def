import { describe, expect, it } from 'vitest';
import { DamageType, TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import { U_TURN_ROUTE } from './damagePlacementFixtures';
import {
  computeConeExtraHitShare,
  computeCorpseExplosionFactor,
  computeGroundZoneDps,
} from './deferredMechanicsValue';
import { createRouteGeometry } from './routeGeometry';
import { computeTargetsPerShot } from './shotReach';
import { computeSampleDamageRate, type DamageModelTower } from './towerDamageModel';

// The conservative terms the damage model gives the deferred talent
// mechanics (tower-def-bge.9).

const geometry = createRouteGeometry(U_TURN_ROUTE);
const TURN_SAMPLE = 8;

function frostTower(abilities: DamageModelTower['stats']['abilities']): DamageModelTower {
  return {
    towerType: TowerTypeId.FROST,
    stats: { ...TOWER_COMBAT_STATS_BY_TYPE.frost, ...(abilities ? { abilities } : {}) },
  };
}

describe('cone valuation', () => {
  it('is nothing without a cone and grows with the opening', () => {
    expect(computeConeExtraHitShare(undefined, 7, geometry, TURN_SAMPLE)).toBe(0);
    const narrow = computeConeExtraHitShare({ coneDegrees: 30 }, 7, geometry, TURN_SAMPLE);
    const wide = computeConeExtraHitShare({ coneDegrees: 60 }, 7, geometry, TURN_SAMPLE);
    expect(narrow).toBeGreaterThan(0);
    expect(wide).toBeCloseTo(narrow * 2);
  });

  it('adds to the targets per shot of a single-target tower', () => {
    const plain = computeTargetsPerShot(frostTower(undefined), geometry, TURN_SAMPLE);
    const cone = computeTargetsPerShot(frostTower({ coneDegrees: 60 }), geometry, TURN_SAMPLE);
    expect(plain).toBe(1);
    expect(cone).toBeGreaterThan(1);
  });
});

describe('corpse explosion valuation', () => {
  const blast = { corpseExplosionShare: 0.5, corpseExplosionRadiusCells: 3 };

  it('is nothing without the ability and scales with the share', () => {
    expect(computeCorpseExplosionFactor(undefined, geometry, TURN_SAMPLE)).toBe(0);
    const half = computeCorpseExplosionFactor(blast, geometry, TURN_SAMPLE);
    const quarter = computeCorpseExplosionFactor(
      { ...blast, corpseExplosionShare: 0.25 },
      geometry,
      TURN_SAMPLE,
    );
    expect(half).toBeGreaterThan(0);
    expect(quarter).toBeCloseTo(half / 2);
  });

  it('raises the damage rate of the tower that carries it', () => {
    const plain = computeSampleDamageRate(frostTower(undefined), geometry, TURN_SAMPLE);
    const corpse = computeSampleDamageRate(frostTower(blast), geometry, TURN_SAMPLE);
    expect(corpse).toBeGreaterThan(plain);
  });
});

describe('ground zone valuation', () => {
  const zone = {
    radiusCells: 2,
    durationMs: 3_000,
    tickMs: 500,
    damage: 5,
    damageType: DamageType.MAGICAL,
  };

  it('values the tick rate on the ground lane only', () => {
    const ground = computeGroundZoneDps({ groundZone: zone }, geometry, TURN_SAMPLE);
    expect(ground).toBeGreaterThanOrEqual(5);
    expect(
      computeGroundZoneDps(
        { groundZone: zone },
        geometry,
        TURN_SAMPLE,
        undefined,
        UnitMoveType.AIR,
      ),
    ).toBe(0);
  });

  it('is nothing for a zone that only slows', () => {
    expect(
      computeGroundZoneDps({ groundZone: { ...zone, damage: 0, chill: 0.5 } }, geometry, 0),
    ).toBe(0);
  });
});
