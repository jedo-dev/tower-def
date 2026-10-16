import { describe, expect, it } from 'vitest';
import type { CreepEntity } from '../../../../entities/creep';
import { selectTowerTarget, type TowerAbilities } from '../../../../entities/tower';
import type { TowerOnHitEffect } from '../../../../entities/tower/model/types';
import { createSeededRandom } from '../../../../shared/lib/random/createSeededRandom';
import {
  ARMOR_KINDS,
  DAMAGE_SCOPES,
  DAMAGE_TYPES,
  EFFECT_IDS,
  TOWER_TYPE_IDS,
  TowerTargetScope,
  TowerTypeId,
  UNIT_SIZE_CLASSES,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import { createFixtureCreep, createFixtureTower } from '../../test/combatCoreFixtures';
import {
  referenceApplySplashDamage,
  referenceResolveTowerAttacks,
  referenceSelectTowerTarget,
} from '../../test/towerCombatReference';
import {
  applySplashDamage,
  getSplashCenterScratch,
  getSplashTargetBuffer,
} from './towerAreaAttacks';
import { getCreepEntitiesForTargetingBuffer, resolveTowerAttacks } from './towerCombatCore';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';
import { getApplyEffectInput, toApplyEffectInput } from './towerStrike';

// tower-def-z6m: the combat core stopped allocating per frame. Each rewritten
// path runs next to a verbatim copy of the old code (test/towerCombatReference)
// on seeded random fields; both must leave the same battlefield and report
// the same events in the same order.

type Field = CombatField<CombatCreep, CombatTower>;
type Random = () => number;

const SCOPES = [TowerTargetScope.GROUND, TowerTargetScope.AIR, TowerTargetScope.BOTH];

function pick<V>(random: Random, values: readonly V[]): V {
  return values[Math.floor(random() * values.length)];
}

function maybe<V>(random: Random, chance: number, value: () => V): V | undefined {
  return random() < chance ? value() : undefined;
}

function createRandomOnHitEffect(random: Random): TowerOnHitEffect {
  const effect: TowerOnHitEffect = { effectId: pick(random, EFFECT_IDS) };
  const magnitude = maybe(random, 0.6, () => 0.05 + random() * 0.5);
  const durationMs = maybe(random, 0.6, () => 200 + Math.floor(random() * 3_000));
  const maxStacks = maybe(random, 0.4, () => 1 + Math.floor(random() * 5));
  const damageType = maybe(random, 0.3, () => pick(random, DAMAGE_TYPES));
  const armorKind = maybe(random, 0.3, () => pick(random, ARMOR_KINDS));
  const damageKind = maybe(random, 0.3, () => pick(random, DAMAGE_SCOPES));
  const freezeAtStacks = maybe(random, 0.3, () => 2 + Math.floor(random() * 3));
  const freezeMs = maybe(random, 0.3, () => 100 + Math.floor(random() * 1_000));
  return {
    ...effect,
    ...(magnitude === undefined ? {} : { magnitude }),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(maxStacks === undefined ? {} : { maxStacks }),
    ...(damageType === undefined ? {} : { damageType }),
    ...(armorKind === undefined ? {} : { armorKind }),
    ...(damageKind === undefined ? {} : { damageKind }),
    ...(freezeAtStacks === undefined ? {} : { freezeAtStacks }),
    ...(freezeMs === undefined ? {} : { freezeMs }),
  };
}

function createRandomAbilities(random: Random): TowerAbilities | undefined {
  if (random() < 0.4) {
    return undefined;
  }
  return {
    ...(random() < 0.3
      ? { critEveryNthShot: 2 + Math.floor(random() * 3), critMultiplier: 2 }
      : {}),
    ...(random() < 0.25 ? { extraTargets: 1 + Math.floor(random() * 3) } : {}),
    ...(random() < 0.2 ? { pierceLine: 0.3 + random() * 0.5 } : {}),
    ...(random() < 0.3 ? { volleyEveryMs: 100 + Math.floor(random() * 600) } : {}),
    ...(random() < 0.2 ? { volleyDamageShare: random() } : {}),
    ...(random() < 0.15 ? { minRangeCells: random() * 2 } : {}),
    ...(random() < 0.2 ? { airDamageMultiplier: 1 + random() } : {}),
  };
}

function createRandomTower(random: Random, index: number): CombatTower {
  const type = pick(random, TOWER_TYPE_IDS);
  const abilities = createRandomAbilities(random);
  const tower = createFixtureTower({
    id: `tower:${index}`,
    type,
    position: { x: Math.floor(random() * 11), y: Math.floor(random() * 11) },
    stats: {
      damage: 20 + Math.floor(random() * 200),
      range: 2 + random() * 6,
      attackCooldownMs: random() < 0.1 ? 0 : 50 + Math.floor(random() * 400),
      onHitEffects: Array.from({ length: Math.floor(random() * 3) }, () =>
        createRandomOnHitEffect(random),
      ),
      ...(type === TowerTypeId.SPLASH || random() < 0.2
        ? { splashRadius: random() < 0.15 ? 0 : 1 + random() * 3 }
        : {}),
    },
    ...(abilities === undefined ? {} : { abilities }),
  });
  tower.entity = { ...tower.entity, allowedTargets: pick(random, SCOPES) };
  return tower;
}

function createRandomCreep(random: Random, index: number): CombatCreep {
  const maxHp = 100 + Math.floor(random() * 900);
  const overrides: Partial<CreepEntity> = {
    hp: maxHp,
    maxHp,
    status: random() < 0.1 ? 'dead' : 'alive',
    moveType: random() < 0.3 ? UnitMoveType.AIR : UnitMoveType.GROUND,
    sizeClass: pick(random, UNIT_SIZE_CLASSES),
    physicalArmor: Math.floor(random() * 6),
    magicalArmor: Math.floor(random() * 6),
  };
  if (random() < 0.85) {
    // Small integers so route-distance ties (and the tie-breaks) are common.
    overrides.remainingRouteDistance = Math.floor(random() * 6);
  } else {
    overrides.remainingRouteDistance = undefined;
  }
  if (random() < 0.1) {
    overrides.invisibleRemainingMs = 500;
  }
  if (random() < 0.15) {
    overrides.abilities = { dodgeEveryNthShot: 2 + Math.floor(random() * 3) };
  }
  return createFixtureCreep(
    `creep:${Math.floor(random() * 40)}:${index}`,
    { x: Math.floor(random() * 12), y: Math.floor(random() * 12) },
    overrides,
  );
}

type RandomBattle = { field: Field; deltas: number[] };

/** Deterministic in `seed`: two calls give two identical, independent battles. */
function createRandomBattle(seed: number): RandomBattle {
  const random = createSeededRandom(seed);
  const towers = Array.from({ length: 1 + Math.floor(random() * 6) }, (_, index) =>
    createRandomTower(random, index),
  );
  const creeps = Array.from({ length: Math.floor(random() * 60) }, (_, index) =>
    createRandomCreep(random, index),
  );
  const deltas = Array.from({ length: 12 }, () =>
    random() < 0.1 ? 0 : Math.floor(random() * 120),
  );
  return { field: { towers, creeps }, deltas };
}

type EventLog = string[];

/** Hooks that log every report, so the event order is compared too. */
function createLoggingHooks(log: EventLog): TowerCombatHooks<CombatCreep, CombatTower> {
  return {
    writeCellCenter: (position, out) => {
      out.x = position.x * 16 + 8;
      out.y = position.y * 16 + 8;
    },
    onCreepHit: (creep) => log.push(`hit ${creep.entity.id} ${creep.entity.hp}`),
    onTargetStruck: (tower) => log.push(`struck ${tower.entity.id}`),
    onDamageDealt: (position, damage, source) =>
      log.push(`damage ${position.x},${position.y} ${damage} ${source}`),
    onEffectApplied: (creep, effectId) => log.push(`effect ${creep.entity.id} ${effectId}`),
    onEffectsTicked: (creep) => log.push(`ticked ${creep.entity.id}`),
    onCreepKilled: (creep, killer) => log.push(`kill ${creep.entity.id} ${killer?.entity.id}`),
    onTowerFired: (tower, target, isSplash) =>
      log.push(`fired ${tower.entity.id} ${target.entity.id} ${isSplash}`),
    onCreepRevived: (creep) => log.push(`revived ${creep.entity.id}`),
    onShotDodged: (tower, target) => log.push(`dodged ${tower.entity.id} ${target.entity.id}`),
  };
}

function snapshot(field: Field): unknown {
  return {
    creeps: field.creeps.map((creep) => creep.entity),
    runtimes: field.towers.map((tower) => tower.runtime),
  };
}

describe('resolveTowerAttacks without per-frame allocations', () => {
  it('matches the pre-rewrite core frame by frame on 250 seeded random battles', () => {
    let battlesWithKills = 0;
    let battlesWithEffects = 0;
    for (let seed = 1; seed <= 250; seed += 1) {
      const expected = createRandomBattle(seed);
      const actual = createRandomBattle(seed);
      const expectedLog: EventLog = [];
      const actualLog: EventLog = [];
      const expectedHooks = createLoggingHooks(expectedLog);
      const actualHooks = createLoggingHooks(actualLog);

      for (const deltaMs of expected.deltas) {
        referenceResolveTowerAttacks(expected.field, expectedHooks, deltaMs);
        resolveTowerAttacks(actual.field, actualHooks, deltaMs);
        expect(snapshot(actual.field), `seed ${seed}`).toEqual(snapshot(expected.field));
      }
      expect(actualLog, `seed ${seed}`).toEqual(expectedLog);
      battlesWithKills += expectedLog.some((line) => line.startsWith('kill')) ? 1 : 0;
      battlesWithEffects += expectedLog.some((line) => line.startsWith('effect')) ? 1 : 0;
    }
    // Guards against a generator whose battles never kill or never apply an effect.
    expect(battlesWithKills).toBeGreaterThan(50);
    expect(battlesWithEffects).toBeGreaterThan(50);
  });

  it('reuses one targeting snapshot buffer across frames', () => {
    const { field } = createRandomBattle(7);
    const hooks = createLoggingHooks([]);
    resolveTowerAttacks(field, hooks, 16);
    const buffer = getCreepEntitiesForTargetingBuffer();

    for (let frame = 0; frame < 20; frame += 1) {
      resolveTowerAttacks(field, hooks, 16);
    }

    expect(getCreepEntitiesForTargetingBuffer()).toBe(buffer);
    expect(buffer).toHaveLength(field.creeps.length);
  });

  it('writes cooldowns into the tower runtime instead of replacing it', () => {
    const tower = createFixtureTower({ abilities: { volleyEveryMs: 500, critEveryNthShot: 2 } });
    const creep = createFixtureCreep('creep:0', { x: 1, y: 1 });
    const runtime = tower.runtime;

    for (let frame = 0; frame < 10; frame += 1) {
      resolveTowerAttacks({ towers: [tower], creeps: [creep] }, createLoggingHooks([]), 100);
    }

    expect(tower.runtime).toBe(runtime);
    expect(runtime.shotCount).toBeGreaterThan(0);
  });
});

describe('selectTowerTarget in one pass', () => {
  it('picks the same creep as the filter/reduce version on 500 seeded fields', () => {
    let found = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = createSeededRandom(seed);
      const tower = createRandomTower(random, 0);
      const creeps = Array.from(
        { length: Math.floor(random() * 50) },
        (_, index) => createRandomCreep(random, index).entity,
      );
      const expected = referenceSelectTowerTarget(tower.entity, creeps);
      expect(selectTowerTarget(tower.entity, creeps), `seed ${seed}`).toBe(expected);
      found += expected === null ? 0 : 1;
    }
    expect(found).toBeGreaterThan(250);
  });
});

describe('applySplashDamage with a reused target stack', () => {
  function firstSplashTower(field: Field): CombatTower {
    const tower = field.towers[0];
    tower.entity = {
      ...tower.entity,
      type: TowerTypeId.SPLASH,
      combatStats: { ...tower.entity.combatStats, splashRadius: 1 + (field.creeps.length % 4) },
    };
    return tower;
  }

  it('matches the filtered-copy version on 300 seeded random fields', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const expected = createRandomBattle(seed);
      const actual = createRandomBattle(seed);
      if (expected.field.creeps.length === 0) {
        continue;
      }
      const expectedLog: EventLog = [];
      const actualLog: EventLog = [];
      const expectedTower = firstSplashTower(expected.field);
      const actualTower = firstSplashTower(actual.field);
      const targetIndex = seed % expected.field.creeps.length;

      referenceApplySplashDamage(
        expected.field,
        expectedTower,
        expected.field.creeps[targetIndex],
        150,
        'physical',
        createLoggingHooks(expectedLog),
      );
      applySplashDamage(
        actual.field,
        actualTower,
        actual.field.creeps[targetIndex],
        150,
        'physical',
        createLoggingHooks(actualLog),
      );

      expect(snapshot(actual.field), `seed ${seed}`).toEqual(snapshot(expected.field));
      expect(actualLog, `seed ${seed}`).toEqual(expectedLog);
    }
  });

  it('keeps an outer selection intact when a splash fires from inside another', () => {
    const run = (splash: typeof applySplashDamage): { log: EventLog; field: Field } => {
      const outer = createRandomBattle(11).field;
      const inner = createRandomBattle(12).field;
      const log: EventLog = [];
      const hooks = createLoggingHooks(log);
      let nested = false;
      const reentrantHooks: TowerCombatHooks<CombatCreep, CombatTower> = {
        ...hooks,
        onCreepHit: (creep) => {
          hooks.onCreepHit(creep);
          if (!nested) {
            nested = true;
            splash(inner, firstSplashTower(inner), inner.creeps[0], 90, 'magical', hooks);
          }
        },
      };
      splash(outer, firstSplashTower(outer), outer.creeps[0], 120, 'physical', reentrantHooks);
      return { log, field: outer };
    };

    const expected = run(referenceApplySplashDamage);
    const actual = run(applySplashDamage);

    expect(actual.log).toEqual(expected.log);
    expect(snapshot(actual.field)).toEqual(snapshot(expected.field));
  });

  it('reuses one stack and releases every slot after the shot', () => {
    const fields = [3, 4, 5, 6].map((seed) => createRandomBattle(seed).field);
    const hooks = createLoggingHooks([]);
    const stack = getSplashTargetBuffer();

    for (let round = 0; round < 3; round += 1) {
      for (const field of fields) {
        applySplashDamage(field, firstSplashTower(field), field.creeps[0], 10, 'physical', hooks);
      }
    }

    expect(getSplashTargetBuffer()).toBe(stack);
    expect(stack.length).toBeGreaterThan(0);
    expect(stack.every((slot) => slot === undefined)).toBe(true);
  });
});

describe('on-hit effect inputs built once per entry', () => {
  it('equals the per-hit input, key for key, on 500 random entries', () => {
    const random = createSeededRandom(99);
    for (let index = 0; index < 500; index += 1) {
      const effect = createRandomOnHitEffect(random);
      const expected = toApplyEffectInput(effect);
      const actual = getApplyEffectInput(effect);
      expect(actual).toEqual(expected);
      expect(Object.keys(actual)).toEqual(Object.keys(expected));
    }
  });

  it('hands out the same frozen input for the same entry', () => {
    const effect = createRandomOnHitEffect(createSeededRandom(5));
    const input = getApplyEffectInput(effect);

    expect(getApplyEffectInput(effect)).toBe(input);
    expect(Object.isFrozen(input)).toBe(true);
  });
});

describe('cell centres written into scratch points', () => {
  it('measures splash and chain distances without a fresh point per creep', () => {
    const outs = new Set<object>();
    let writes = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const { field, deltas } = createRandomBattle(seed);
      const hooks = createLoggingHooks([]);
      const countingHooks: TowerCombatHooks<CombatCreep, CombatTower> = {
        ...hooks,
        writeCellCenter: (position, out) => {
          outs.add(out);
          writes += 1;
          hooks.writeCellCenter(position, out);
        },
      };
      for (const deltaMs of deltas) {
        resolveTowerAttacks(field, countingHooks, deltaMs);
      }
    }

    // Splash tower centre, splash creep centre and the chain point: nothing else.
    expect(writes).toBeGreaterThan(1_000);
    expect(outs.size).toBeLessThanOrEqual(3);
    for (const point of getSplashCenterScratch()) {
      expect(outs.has(point)).toBe(true);
    }
  });
});
