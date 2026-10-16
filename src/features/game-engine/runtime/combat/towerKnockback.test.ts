import { describe, expect, it } from 'vitest';
import { TowerTypeId, UnitSizeClass } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';

// Combat-core integration: `knockbackCells` (tower-def-bge.9, Mortar and
// Grapeshot). Every hit of the tower queues the push on small and medium
// creeps; the movement step applies it (see movement/knockback.test.ts).
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };

describe('knockbackCells', () => {
  it('queues the push on every small or medium creep the blast hits, not on large ones', () => {
    const small = createFixtureCreep(
      'small',
      { x: 1, y: 0 },
      { sizeClass: UnitSizeClass.SMALL, remainingRouteDistance: 1 },
    );
    const medium = createFixtureCreep('medium', { x: 0, y: 1 });
    const large = createFixtureCreep('large', { x: 1, y: 1 }, { sizeClass: UnitSizeClass.LARGE });
    const tower = createFixtureTower({
      type: TowerTypeId.SPLASH,
      position: TOWER_AT_ORIGIN,
      stats: { splashRadius: 3 },
      abilities: { knockbackCells: 0.5 },
    });
    resolveTowerAttacks(
      createFixtureField([tower], [small, medium, large]),
      createRecordingHooks(),
      1_000,
    );

    expect(small.entity.pendingKnockbackCells).toBe(0.5);
    expect(medium.entity.pendingKnockbackCells).toBe(0.5);
    expect(large.entity.pendingKnockbackCells).toBeUndefined();
  });

  it('queues nothing on a creep the hit killed', () => {
    const weak = createFixtureCreep('weak', { x: 2, y: 0 }, { hp: 50 });
    const tower = createFixtureTower({
      position: TOWER_AT_ORIGIN,
      abilities: { knockbackCells: 1 },
    });
    resolveTowerAttacks(createFixtureField([tower], [weak]), createRecordingHooks(), 1_000);
    expect(weak.entity.status).toBe('dead');
    expect(weak.entity.pendingKnockbackCells).toBeUndefined();
  });
});
