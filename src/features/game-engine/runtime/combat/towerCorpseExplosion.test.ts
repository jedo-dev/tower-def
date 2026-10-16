import { describe, expect, it } from 'vitest';
import type { TowerAbilities } from '../../../../entities/tower';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';
import { getCorpseExplosionQueue } from './towerCorpseExplosions';

// Combat-core integration: corpse explosions (tower-def-bge.9, Corpse Blast).
// The tower's footprint centre is the origin; its shot kills the target at
// (3, 0), whose corpse explodes for 10% of its 1000 maximum health.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };
const BLAST: TowerAbilities = { corpseExplosionShare: 0.1, corpseExplosionRadiusCells: 1.5 };

function corpseTower(abilities: TowerAbilities = BLAST, allowedTargets?: 'ground') {
  const tower = createFixtureTower({ position: TOWER_AT_ORIGIN, abilities });
  if (allowedTargets) {
    tower.entity.allowedTargets = allowedTargets;
  }
  return tower;
}

function doomedTarget() {
  return createFixtureCreep(
    'target',
    { x: 3, y: 0 },
    { hp: 50, maxHp: 1_000, remainingRouteDistance: 1 },
  );
}

describe('corpse explosions', () => {
  it('a kill explodes for the share of the dead creep maximum health within the radius', () => {
    const near = createFixtureCreep('near', { x: 4, y: 0 });
    const side = createFixtureCreep('side', { x: 3, y: 1.4 });
    const far = createFixtureCreep('far', { x: 5, y: 0 });
    const flier = createFixtureCreep('flier', { x: 3.5, y: 0 }, { moveType: UnitMoveType.AIR });
    const hooks = createRecordingHooks();
    resolveTowerAttacks(
      createFixtureField([corpseTower(BLAST, 'ground')], [doomedTarget(), near, side, far, flier]),
      hooks,
      1_000,
    );

    expect(damageTaken(near)).toBe(100);
    expect(damageTaken(side)).toBe(100);
    expect(damageTaken(far)).toBe(0);
    expect(damageTaken(flier)).toBe(0);
    expect(hooks.damageNumbers).toEqual([50, 200]);
    expect(getCorpseExplosionQueue().every((slot) => slot === undefined)).toBe(true);
  });

  it('chains only as many generations as the limit allows, crediting the tower', () => {
    const run = (corpseExplosionChainLimit?: number) => {
      const second = createFixtureCreep('second', { x: 4, y: 0 }, { hp: 80, maxHp: 1_000 });
      const third = createFixtureCreep('third', { x: 5.2, y: 0 });
      const hooks = createRecordingHooks();
      const abilities = {
        ...BLAST,
        ...(corpseExplosionChainLimit ? { corpseExplosionChainLimit } : {}),
      };
      resolveTowerAttacks(
        createFixtureField([corpseTower(abilities)], [doomedTarget(), second, third]),
        hooks,
        1_000,
      );
      return { hooks, second, third };
    };

    const single = run();
    expect(single.second.entity.status).toBe('dead');
    expect(damageTaken(single.third)).toBe(0);
    expect(single.hooks.kills).toEqual([
      { creepId: 'target', killerId: 'tower:fixture' },
      { creepId: 'second', killerId: 'tower:fixture' },
    ]);

    const chained = run(2);
    expect(damageTaken(chained.third)).toBe(100);
  });

  it('towers without the ability leave corpses alone', () => {
    const near = createFixtureCreep('near', { x: 4, y: 0 });
    resolveTowerAttacks(
      createFixtureField([corpseTower({})], [doomedTarget(), near]),
      createRecordingHooks(),
      1_000,
    );
    expect(damageTaken(near)).toBe(0);
  });
});
