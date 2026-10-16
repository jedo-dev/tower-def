import { describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../../shared/types/content-ids';
import { TOWER_COMBAT_STATS_BY_TYPE } from '../../../tower/model/types';
import { U_TURN_ROUTE } from './damagePlacementFixtures';
import { computeConeExtraHitShare } from './deferredMechanicsValue';
import { createRouteGeometry } from './routeGeometry';
import { computeTargetsPerShot, type DamageModelTower } from './towerDamageModel';

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
