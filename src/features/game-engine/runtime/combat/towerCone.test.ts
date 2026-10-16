import { describe, expect, it } from 'vitest';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';

// Combat-core integration: `coneDegrees` (tower-def-bge.9, Wyrm Breath). The
// tower footprint centre sits at the origin; the target is straight east.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };

function coneTower(coneDegrees: number, allowedTargets?: 'ground') {
  const tower = createFixtureTower({ position: TOWER_AT_ORIGIN, abilities: { coneDegrees } });
  if (allowedTargets) {
    tower.entity.allowedTargets = allowedTargets;
  }
  return tower;
}

describe('coneDegrees', () => {
  it('hits every valid creep inside the cone toward the target at full damage', () => {
    const target = createFixtureCreep('target', { x: 4, y: 0 }, { remainingRouteDistance: 1 });
    const inside = createFixtureCreep('inside', { x: 3, y: 1 }); // ~18 degrees off axis
    const edge = createFixtureCreep('edge', { x: 2, y: 2.5 }); // ~51 degrees: outside 60
    const behind = createFixtureCreep('behind', { x: -3, y: 0 });
    const outOfRange = createFixtureCreep('far', { x: 8, y: 0 });
    const hooks = createRecordingHooks();
    resolveTowerAttacks(
      createFixtureField([coneTower(60)], [target, inside, edge, behind, outOfRange]),
      hooks,
      1_000,
    );

    expect(damageTaken(target)).toBe(100);
    expect(damageTaken(inside)).toBe(100);
    expect(damageTaken(edge)).toBe(0);
    expect(damageTaken(behind)).toBe(0);
    expect(damageTaken(outOfRange)).toBe(0);
    expect(hooks.hitCreepIds).toEqual(['target', 'inside']);
  });

  it('a wider cone reaches further off axis', () => {
    const target = createFixtureCreep('target', { x: 4, y: 0 }, { remainingRouteDistance: 1 });
    const edge = createFixtureCreep('edge', { x: 2, y: 2.5 });
    resolveTowerAttacks(
      createFixtureField([coneTower(120)], [target, edge]),
      createRecordingHooks(),
      1_000,
    );
    expect(damageTaken(edge)).toBe(100);
  });

  it('skips creeps outside the tower scope and credits cone kills to the tower', () => {
    const target = createFixtureCreep('target', { x: 4, y: 0 }, { remainingRouteDistance: 1 });
    const flier = createFixtureCreep('flier', { x: 3, y: 0 }, { moveType: UnitMoveType.AIR });
    const weak = createFixtureCreep('weak', { x: 2, y: 0 }, { hp: 50 });
    const hooks = createRecordingHooks();
    resolveTowerAttacks(
      createFixtureField([coneTower(40, 'ground')], [target, flier, weak]),
      hooks,
      1_000,
    );
    expect(damageTaken(flier)).toBe(0);
    expect(hooks.kills).toEqual([{ creepId: 'weak', killerId: 'tower:fixture' }]);
  });
});
