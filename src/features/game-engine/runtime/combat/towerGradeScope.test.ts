import { describe, expect, it } from 'vitest';
import { TowerTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';

// Combat-core integration: a level or grade `allowedTargets` (tower-def-bge.9)
// overrides a ground-only splash tower's scope for targeting and the blast.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };

function splashTower(allowedTargets?: 'ground' | 'both') {
  const tower = createFixtureTower({
    type: TowerTypeId.SPLASH,
    position: TOWER_AT_ORIGIN,
    stats: { splashRadius: 3, ...(allowedTargets === undefined ? {} : { allowedTargets }) },
  });
  tower.entity.allowedTargets = 'ground';
  return tower;
}

describe('per-grade allowedTargets', () => {
  it('a ground-only splash tower ignores a flier', () => {
    const flier = createFixtureCreep('flier', { x: 1, y: 0 }, { moveType: UnitMoveType.AIR });
    resolveTowerAttacks(
      createFixtureField([splashTower()], [flier]),
      createRecordingHooks(),
      1_000,
    );
    expect(damageTaken(flier)).toBe(0);
  });

  it('a grade scope of both targets the flier and catches it in the blast', () => {
    const flier = createFixtureCreep(
      'flier',
      { x: 1, y: 0 },
      { moveType: UnitMoveType.AIR, remainingRouteDistance: 1 },
    );
    const walker = createFixtureCreep('walker', { x: 0, y: 1 });
    const hooks = createRecordingHooks();
    resolveTowerAttacks(createFixtureField([splashTower('both')], [flier, walker]), hooks, 1_000);
    expect(damageTaken(flier)).toBe(100);
    expect(damageTaken(walker)).toBe(100);
    expect(hooks.firedTowerIds).toEqual(['tower:fixture']);
  });
});
