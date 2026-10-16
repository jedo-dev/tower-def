import { describe, expect, it } from 'vitest';
import { UnitMoveType, UnitSizeClass } from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
  type FixtureTowerOptions,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks } from './towerCombatCore';

// Combat-core integration: abilities on a single-target tower, fought
// through `resolveTowerAttacks` like the game scene and the headless duel.
// The tower anchor sits at (-0.5, -0.5) so its footprint centre is (0, 0).
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };

function tower(options: FixtureTowerOptions = {}) {
  return createFixtureTower({ position: TOWER_AT_ORIGIN, ...options });
}

/** Fires `shots` attacks, one per cooldown. */
function fire(field: ReturnType<typeof createFixtureField>, shots: number) {
  const hooks = createRecordingHooks();
  for (let shot = 0; shot < shots; shot += 1) {
    resolveTowerAttacks(field, hooks, 1_000);
  }
  return hooks;
}

describe('abilities absent', () => {
  it('hits only the target for the plain damage', () => {
    const target = createFixtureCreep('target', { x: 3, y: 0 }, { remainingRouteDistance: 1 });
    const other = createFixtureCreep('other', { x: 1, y: 0 });
    fire(createFixtureField([tower()], [target, other]), 3);

    expect(damageTaken(target)).toBe(300);
    expect(damageTaken(other)).toBe(0);
  });
});

describe('critEveryNthShot', () => {
  it('multiplies every Nth shot, counting shots per tower', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 0 });
    const field = createFixtureField(
      [tower({ abilities: { critEveryNthShot: 3, critMultiplier: 2.5 } })],
      [creep],
    );

    const hooks = fire(field, 6);

    expect(hooks.damageNumbers).toEqual([100, 100, 250, 100, 100, 250]);
    expect(field.towers[0].runtime.shotCount).toBe(6);
  });

  it('is deterministic: two identical fields deal identical damage', () => {
    const run = () => {
      const creep = createFixtureCreep('creep', { x: 3, y: 0 });
      fire(
        createFixtureField(
          [tower({ abilities: { critEveryNthShot: 2, critMultiplier: 3 } })],
          [creep],
        ),
        7,
      );
      return creep.entity.hp;
    };
    expect(run()).toBe(run());
  });
});

describe('extraTargets', () => {
  it('also hits the N nearest other valid creeps in range for the damage share', () => {
    const target = createFixtureCreep('target', { x: 5, y: 0 }, { remainingRouteDistance: 1 });
    const near = createFixtureCreep('near', { x: 1, y: 0 });
    const middle = createFixtureCreep('middle', { x: 2, y: 0 });
    const far = createFixtureCreep('far', { x: 4, y: 0 });
    const outOfRange = createFixtureCreep('out', { x: 9, y: 0 });
    fire(
      createFixtureField(
        [tower({ abilities: { extraTargets: 2, extraTargetDamageShare: 0.5 } })],
        [target, far, middle, near, outOfRange],
      ),
      1,
    );

    expect(damageTaken(target)).toBe(100);
    expect(damageTaken(near)).toBe(50);
    expect(damageTaken(middle)).toBe(50);
    expect(damageTaken(far)).toBe(0);
    expect(damageTaken(outOfRange)).toBe(0);
  });

  it('breaks distance ties by id and credits extra kills to the tower', () => {
    const target = createFixtureCreep('target', { x: 5, y: 0 }, { remainingRouteDistance: 1 });
    const b = createFixtureCreep('b', { x: 0, y: 2 }, { hp: 40 });
    const a = createFixtureCreep('a', { x: 2, y: 0 }, { hp: 40 });
    const hooks = fire(
      createFixtureField([tower({ abilities: { extraTargets: 1 } })], [target, b, a]),
      1,
    );

    expect(a.entity.status).toBe('dead');
    expect(b.entity.hp).toBe(40);
    expect(hooks.kills).toEqual([{ creepId: 'a', killerId: 'tower:fixture' }]);
  });
});

describe('pierceLine', () => {
  it('hits every other valid creep on the line to the target for the share', () => {
    const target = createFixtureCreep('target', { x: 5, y: 0 }, { remainingRouteDistance: 1 });
    const onLine = createFixtureCreep('on-line', { x: 2, y: 0 });
    const nearLine = createFixtureCreep('near-line', { x: 3, y: 0.4 });
    const offLine = createFixtureCreep('off-line', { x: 3, y: 1 });
    const behind = createFixtureCreep('behind', { x: -2, y: 0 });
    fire(
      createFixtureField(
        [tower({ abilities: { pierceLine: 0.4 } })],
        [target, onLine, nearLine, offLine, behind],
      ),
      1,
    );

    expect(damageTaken(target)).toBe(100);
    expect(damageTaken(onLine)).toBe(40);
    expect(damageTaken(nearLine)).toBe(40);
    expect(damageTaken(offLine)).toBe(0);
    expect(damageTaken(behind)).toBe(0);
  });
});

describe('per-target multipliers', () => {
  it('scales air, ground, full-health and large targets', () => {
    const flier = createFixtureCreep(
      'flier',
      { x: 1, y: 0 },
      { moveType: UnitMoveType.AIR, hp: 500, maxHp: 1_000 },
    );
    const large = createFixtureCreep(
      'large',
      { x: 1, y: 1 },
      { sizeClass: UnitSizeClass.LARGE, hp: 500, maxHp: 1_000 },
    );
    const fresh = createFixtureCreep('fresh', { x: 2, y: 0 });
    const abilities = {
      airDamageMultiplier: 2,
      groundDamageMultiplier: 0.5,
      fullHealthBonusMultiplier: 3,
      largeTargetMultiplier: 1.5,
      extraTargets: 2,
    };
    fire(createFixtureField([tower({ abilities })], [flier, large, fresh]), 1);

    expect(flier.entity.hp).toBe(500 - 200);
    expect(1_000 - large.entity.hp).toBe(500 + 75);
    expect(damageTaken(fresh)).toBe(150);
  });
});

describe('minRangeCells', () => {
  it('ignores creeps closer than the minimum range', () => {
    const close = createFixtureCreep('close', { x: 1, y: 0 }, { remainingRouteDistance: 1 });
    const distant = createFixtureCreep('distant', { x: 4, y: 0 }, { remainingRouteDistance: 5 });
    fire(createFixtureField([tower({ abilities: { minRangeCells: 2 } })], [close, distant]), 1);

    expect(damageTaken(close)).toBe(0);
    expect(damageTaken(distant)).toBe(100);
  });
});

describe('volleyEveryMs', () => {
  it('hits every valid creep in range once per period, apart from its normal attack', () => {
    const creeps = [
      createFixtureCreep('a', { x: 1, y: 0 }, { remainingRouteDistance: 1 }),
      createFixtureCreep('b', { x: 0, y: 3 }),
      createFixtureCreep('c', { x: -4, y: 0 }),
      createFixtureCreep('out', { x: 12, y: 0 }),
    ];
    const volleyTower = tower({
      stats: { attackCooldownMs: 10_000 },
      abilities: { volleyEveryMs: 2_000, volleyDamageShare: 0.5 },
    });
    const field = createFixtureField([volleyTower], creeps);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 100);
    expect(creeps.map(damageTaken)).toEqual([150, 50, 50, 0]);

    resolveTowerAttacks(field, hooks, 1_000);
    expect(creeps.map(damageTaken)).toEqual([150, 50, 50, 0]);

    resolveTowerAttacks(field, hooks, 1_000);
    expect(creeps.map(damageTaken)).toEqual([200, 100, 100, 0]);
    expect(volleyTower.runtime.volleyCooldownRemainingMs).toBe(2_000);
  });

  it('waits ready until a creep is in range', () => {
    const volleyTower = tower({ abilities: { volleyEveryMs: 1_000 } });
    const creep = createFixtureCreep('creep', { x: 20, y: 0 });
    const field = createFixtureField([volleyTower], [creep]);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 5_000);
    expect(volleyTower.runtime.volleyCooldownRemainingMs).toBe(0);

    creep.entity = { ...creep.entity, position: { x: 2, y: 0 } };
    resolveTowerAttacks(field, hooks, 50);
    expect(hooks.struckTowerIds.length).toBeGreaterThanOrEqual(1);
    expect(volleyTower.runtime.volleyCooldownRemainingMs).toBe(1_000);
  });
});
