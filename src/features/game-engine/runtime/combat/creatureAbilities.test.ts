import { describe, expect, it } from 'vitest';
import {
  createCreepAbilityRuntime,
  findActiveEffect,
  type CreepEntity,
} from '../../../../entities/creep';
import { DamageType, EffectId, TowerTypeId } from '../../../../shared/types/content-ids';
import type { CreatureAbilities } from '../../../../shared/types/creatureAbilities';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
  type RecordingHooks,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks, tickFieldCreepEffects } from './towerCombatCore';

// Combat-core integration of the creature abilities: the same
// `resolveTowerAttacks` / `tickFieldCreepEffects` the game scene and the
// headless duel run, with creeps that carry `abilities` as spawn copies them.

function abilityCreep(
  id: string,
  abilities: CreatureAbilities,
  overrides: Partial<CreepEntity> = {},
  x = 3,
) {
  return createFixtureCreep(
    id,
    { x, y: 0 },
    { abilities, ...createCreepAbilityRuntime(abilities, 10), ...overrides },
  );
}

/** Fires `shots` attacks, one per cooldown, recording revives and dodges too. */
function fire(field: ReturnType<typeof createFixtureField>, shots: number) {
  const hooks: RecordingHooks & { revivedIds: string[]; dodgedIds: string[] } = {
    ...createRecordingHooks(),
    revivedIds: [],
    dodgedIds: [],
  };
  hooks.onCreepRevived = (creep) => hooks.revivedIds.push(creep.entity.id);
  hooks.onShotDodged = (_tower, target) => hooks.dodgedIds.push(target.entity.id);
  for (let shot = 0; shot < shots; shot += 1) {
    resolveTowerAttacks(field, hooks, 1_000);
  }
  return hooks;
}

describe('effectResistance', () => {
  it('weakens a frost tower chill and blocks it on an immune creep', () => {
    const resistant = abilityCreep('resistant', { effectResistance: { chill: 0.5 } });
    const immune = abilityCreep('immune', { effectResistance: { chill: 0 } });
    const chill = { effectId: EffectId.CHILL, magnitude: 0.4, durationMs: 1_000 };
    const frost = () =>
      createFixtureTower({ type: TowerTypeId.FROST, stats: { onHitEffects: [chill] } });

    fire(createFixtureField([frost()], [resistant]), 1);
    fire(createFixtureField([frost()], [immune]), 1);

    expect(findActiveEffect(resistant.entity, EffectId.CHILL)?.magnitude).toBe(0.2);
    expect(findActiveEffect(immune.entity, EffectId.CHILL)).toBeUndefined();
    expect(damageTaken(immune)).toBe(100);
  });
});

describe('dodgeEveryNthShot', () => {
  it('misses every Nth single-target shot aimed at the creep: no damage, no effects', () => {
    const creep = abilityCreep('dodger', { dodgeEveryNthShot: 3 });
    const tower = createFixtureTower({
      stats: { onHitEffects: [{ effectId: EffectId.CHILL, durationMs: 50_000 }] },
    });
    const field = createFixtureField([tower], [creep]);

    const hooks = fire(field, 3);

    expect(damageTaken(creep)).toBe(200);
    expect(hooks.dodgedIds).toEqual(['dodger']);
    expect(hooks.firedTowerIds).toHaveLength(3);
    expect(creep.entity.shotsAimedAt).toBe(3);

    creep.entity.activeEffects = [];
    fire(field, 3);
    expect(damageTaken(creep)).toBe(400);
  });

  it('never dodges splash or chain hits', () => {
    const splashTarget = abilityCreep('splash', { dodgeEveryNthShot: 2 });
    const chainTarget = abilityCreep('chain', { dodgeEveryNthShot: 2 });
    const splash = createFixtureTower({ type: TowerTypeId.SPLASH, stats: { splashRadius: 6 } });
    const chain = createFixtureTower({ type: TowerTypeId.CHAIN });

    fire(createFixtureField([splash], [splashTarget]), 4);
    fire(createFixtureField([chain], [chainTarget]), 4);

    expect(damageTaken(splashTarget)).toBe(400);
    expect(damageTaken(chainTarget)).toBe(400);
  });
});

describe('startInvisibleMs', () => {
  it('keeps towers from aiming at or splashing the creep until it shows', () => {
    const hidden = abilityCreep('hidden', { startInvisibleMs: 1_500 });
    const visible = createFixtureCreep('visible', { x: 3, y: 1 }, { remainingRouteDistance: 50 });
    const splash = createFixtureTower({ type: TowerTypeId.SPLASH, stats: { splashRadius: 6 } });
    const field = createFixtureField([splash], [hidden, visible]);
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 1_000);
    expect(damageTaken(hidden)).toBe(0);
    expect(damageTaken(visible)).toBe(100);

    tickFieldCreepEffects(field, hooks, 1_500);
    resolveTowerAttacks(field, hooks, 1_000);
    expect(damageTaken(hidden)).toBe(100);
  });

  it('lets damage over time already applied keep ticking', () => {
    const hidden = abilityCreep('hidden', { startInvisibleMs: 10_000 });
    hidden.entity.activeEffects = [
      {
        id: EffectId.POISON,
        magnitude: 10,
        remainingMs: 2_000,
        stacks: 1,
        maxStacks: 3,
        nextTickInMs: 500,
      },
    ];
    const field = createFixtureField([], [hidden]);

    tickFieldCreepEffects(field, createRecordingHooks(), 1_000);

    expect(damageTaken(hidden)).toBeGreaterThan(0);
  });
});

describe('incomingDamageMultipliers', () => {
  it('scales splash, chain and single hits by shape', () => {
    const abilities = { incomingDamageMultipliers: { splash: 0.5, chain: 0.25, single: 2 } };
    const splashTarget = abilityCreep('splash', abilities);
    const chainTarget = abilityCreep('chain', abilities);
    const singleTarget = abilityCreep('single', abilities);

    fire(
      createFixtureField(
        [createFixtureTower({ type: TowerTypeId.SPLASH, stats: { splashRadius: 6 } })],
        [splashTarget],
      ),
      1,
    );
    fire(createFixtureField([createFixtureTower({ type: TowerTypeId.CHAIN })], [chainTarget]), 1);
    fire(createFixtureField([createFixtureTower()], [singleTarget]), 1);

    expect(damageTaken(splashTarget)).toBe(50);
    expect(damageTaken(chainTarget)).toBe(25);
    expect(damageTaken(singleTarget)).toBe(200);
  });

  it('scales damage over time ticks by the dot multiplier', () => {
    const tick = (abilities: CreatureAbilities | undefined) => {
      const creep =
        abilities === undefined
          ? createFixtureCreep('plain', { x: 3, y: 0 })
          : abilityCreep('dot', abilities);
      creep.entity.activeEffects = [
        {
          id: EffectId.POISON,
          magnitude: 10,
          remainingMs: 2_000,
          stacks: 1,
          maxStacks: 3,
          nextTickInMs: 500,
          damageType: DamageType.PHYSICAL,
        },
      ];
      tickFieldCreepEffects(createFixtureField([], [creep]), createRecordingHooks(), 500);
      return damageTaken(creep);
    };

    expect(tick(undefined)).toBe(10);
    expect(tick({ incomingDamageMultipliers: { dot: 0.5 } })).toBe(5);
  });
});

describe('healthRegenPerSecond', () => {
  it('heals between attacks and pauses under poison when authored', () => {
    const regen = abilityCreep('regen', { healthRegenPerSecond: 20 }, { hp: 9_000 });
    const paused = abilityCreep(
      'paused',
      { healthRegenPerSecond: 20, regenPausedByPoison: true },
      { hp: 9_000 },
    );
    const poison = {
      id: EffectId.POISON,
      magnitude: 0,
      remainingMs: 5_000,
      stacks: 1,
      maxStacks: 3,
      nextTickInMs: 500,
    };
    paused.entity.activeEffects = [poison];

    tickFieldCreepEffects(createFixtureField([], [regen, paused]), createRecordingHooks(), 1_000);

    expect(regen.entity.hp).toBe(9_020);
    expect(paused.entity.hp).toBe(9_000);
  });
});

describe('shield', () => {
  it('absorbs hits first and recharges after a quiet spell', () => {
    const creep = abilityCreep('shielded', { shieldHp: 150, shieldRechargeMs: 2_000 });
    const field = createFixtureField([createFixtureTower()], [creep]);

    fire(field, 2);
    expect(damageTaken(creep)).toBe(50);
    expect(creep.entity.shieldHp).toBe(0);

    tickFieldCreepEffects(createFixtureField([], [creep]), createRecordingHooks(), 2_000);
    expect(creep.entity.shieldHp).toBe(150);
  });
});

describe('secondLife', () => {
  it('revives once without a kill, then the final death pays out', () => {
    const creep = abilityCreep('phoenix', { secondLife: { hpShare: 0.01 } }, { hp: 100 });
    const field = createFixtureField([createFixtureTower()], [creep]);

    const first = fire(field, 1);
    expect(first.kills).toEqual([]);
    expect(first.revivedIds).toEqual(['phoenix']);
    expect(creep.entity).toMatchObject({ hp: 100, status: 'alive', isOnSecondLife: true });

    const second = fire(field, 1);
    expect(second.kills).toEqual([{ creepId: 'phoenix', killerId: 'tower:fixture' }]);
    expect(second.revivedIds).toEqual([]);
  });

  it('revives from a damage over time tick without a kill', () => {
    const creep = abilityCreep('phoenix', { secondLife: { hpShare: 0.5 } }, { hp: 5 });
    creep.entity.activeEffects = [
      {
        id: EffectId.POISON,
        magnitude: 10,
        remainingMs: 2_000,
        stacks: 1,
        maxStacks: 3,
        nextTickInMs: 500,
      },
    ];
    const hooks = { ...createRecordingHooks(), revived: 0 };
    hooks.onCreepRevived = () => {
      hooks.revived += 1;
    };

    tickFieldCreepEffects(createFixtureField([], [creep]), hooks, 500);

    expect(hooks.kills).toEqual([]);
    expect(hooks.revived).toBe(1);
    expect(creep.entity.status).toBe('alive');
  });
});
