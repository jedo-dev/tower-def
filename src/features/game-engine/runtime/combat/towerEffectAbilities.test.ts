import { describe, expect, it } from 'vitest';
import {
  findActiveEffect,
  getActiveEffects,
  getEffectiveArmor,
  getEffectiveSpeedMultiplier,
} from '../../../../entities/creep';
import { resolveEffectDefinition } from '../../../../shared/constants/effects';
import {
  ArmorKind,
  DamageScope,
  DamageType,
  EffectId,
  TowerTypeId,
} from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureField,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import { resolveTowerAttacks, tickFieldCreepEffects } from './towerCombatCore';

// Combat-core integration of the on-hit effect extensions: vulnerability,
// per-armor breaks, stacking burn, stun on hit and the chill freeze.

function hitOnce(field: ReturnType<typeof createFixtureField>) {
  const hooks = createRecordingHooks();
  resolveTowerAttacks(field, hooks, 1_000);
  return hooks;
}

describe('vulnerability on hit', () => {
  it('raises later damage of its kind and leaves other kinds alone', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 });
    const exposer = createFixtureTower({
      id: 'exposer',
      stats: {
        damage: 0,
        onHitEffects: [
          {
            effectId: EffectId.VULNERABILITY,
            magnitude: 0.5,
            durationMs: 5_000,
            damageKind: DamageScope.PHYSICAL,
          },
        ],
      },
    });
    hitOnce(createFixtureField([exposer], [creep]));

    // A physical archer now lands +50%; a magical frost tower does not.
    hitOnce(createFixtureField([createFixtureTower({ id: 'archer' })], [creep]));
    expect(damageTaken(creep)).toBe(150);

    const frost = createFixtureTower({ id: 'frost', type: TowerTypeId.FROST });
    hitOnce(createFixtureField([frost], [creep]));
    expect(damageTaken(creep)).toBe(250);
  });

  it('with no kind amplifies every type, damage over time included', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 });
    const field = createFixtureField(
      [
        createFixtureTower({
          stats: {
            damage: 0,
            onHitEffects: [
              { effectId: EffectId.VULNERABILITY, magnitude: 1 },
              { effectId: EffectId.BURN, magnitude: 10, damageType: DamageType.MAGICAL },
            ],
          },
        }),
      ],
      [creep],
    );
    const hooks = hitOnce(field);
    tickFieldCreepEffects(field, hooks, resolveEffectDefinition(EffectId.BURN).tickIntervalMs);

    expect(damageTaken(creep)).toBe(20);
  });
});

describe('armor break by armor kind', () => {
  it('a physical break lowers physical armor only; a both break lowers both', () => {
    const creep = createFixtureCreep(
      'creep',
      { x: 3, y: 1 },
      { physicalArmor: 5, magicalArmor: 5 },
    );
    const physicalBreaker = createFixtureTower({
      stats: {
        damage: 0,
        onHitEffects: [
          { effectId: EffectId.ARMOR_BREAK, magnitude: 4, armorKind: ArmorKind.PHYSICAL },
        ],
      },
    });
    hitOnce(createFixtureField([physicalBreaker], [creep]));

    expect(getEffectiveArmor(creep.entity, ArmorKind.PHYSICAL)).toBe(1);
    expect(getEffectiveArmor(creep.entity, ArmorKind.MAGICAL)).toBe(5);

    const bothBreaker = createFixtureTower({
      stats: { damage: 0, onHitEffects: [{ effectId: EffectId.ARMOR_BREAK, magnitude: 2 }] },
    });
    hitOnce(createFixtureField([bothBreaker], [creep]));

    expect(getEffectiveArmor(creep.entity, ArmorKind.PHYSICAL)).toBe(-1);
    expect(getEffectiveArmor(creep.entity, ArmorKind.MAGICAL)).toBe(3);
    expect(getActiveEffects(creep.entity)).toHaveLength(2);
  });
});

describe('burn on hit', () => {
  it('stacks like poison and ticks with its overridden damage type', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 }, { magicalArmor: 50 });
    const field = createFixtureField(
      [
        createFixtureTower({
          stats: {
            damage: 0,
            onHitEffects: [
              { effectId: EffectId.BURN, magnitude: 10, damageType: DamageType.PHYSICAL },
            ],
          },
        }),
      ],
      [creep],
    );
    const hooks = createRecordingHooks();
    for (let shot = 0; shot < 4; shot += 1) {
      resolveTowerAttacks(field, hooks, 1_000);
    }

    const burn = findActiveEffect(creep.entity, EffectId.BURN);
    expect(burn?.stacks).toBe(resolveEffectDefinition(EffectId.BURN).maxStacks);

    const before = creep.entity.hp;
    tickFieldCreepEffects(field, hooks, resolveEffectDefinition(EffectId.BURN).tickIntervalMs);
    expect(before - creep.entity.hp).toBe(30);
  });
});

describe('stun on hit', () => {
  it('stops the creep for its duration', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 });
    const field = createFixtureField(
      [
        createFixtureTower({
          stats: { onHitEffects: [{ effectId: EffectId.STUN, durationMs: 400 }] },
        }),
      ],
      [creep],
    );
    const hooks = hitOnce(field);

    expect(getEffectiveSpeedMultiplier(creep.entity)).toBe(0);
    tickFieldCreepEffects(field, hooks, 400);
    expect(getEffectiveSpeedMultiplier(creep.entity)).toBe(1);
  });
});

describe('chill freeze', () => {
  it('freezes on every Nth chilling hit for freezeMs, counted as a stun', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 });
    const field = createFixtureField(
      [
        createFixtureTower({
          stats: {
            damage: 0,
            onHitEffects: [
              { effectId: EffectId.CHILL, magnitude: 0.3, freezeAtStacks: 3, freezeMs: 900 },
            ],
          },
        }),
      ],
      [creep],
    );
    const hooks = createRecordingHooks();

    resolveTowerAttacks(field, hooks, 1_000);
    resolveTowerAttacks(field, hooks, 1_000);
    expect(findActiveEffect(creep.entity, EffectId.STUN)).toBeUndefined();
    expect(getEffectiveSpeedMultiplier(creep.entity)).toBeCloseTo(0.7);

    resolveTowerAttacks(field, hooks, 1_000);
    expect(findActiveEffect(creep.entity, EffectId.STUN)?.remainingMs).toBe(900);
    expect(getEffectiveSpeedMultiplier(creep.entity)).toBe(0);
    expect(findActiveEffect(creep.entity, EffectId.CHILL)?.freezeCharge).toBe(0);
  });

  it('a chill without freezeAtStacks never freezes', () => {
    const creep = createFixtureCreep('creep', { x: 3, y: 1 });
    const field = createFixtureField(
      [createFixtureTower({ stats: { damage: 0, onHitEffects: [{ effectId: EffectId.CHILL }] } })],
      [creep],
    );
    const hooks = createRecordingHooks();
    for (let shot = 0; shot < 10; shot += 1) {
      resolveTowerAttacks(field, hooks, 1_000);
    }

    expect(findActiveEffect(creep.entity, EffectId.STUN)).toBeUndefined();
    expect(findActiveEffect(creep.entity, EffectId.CHILL)?.freezeCharge).toBeUndefined();
  });
});
