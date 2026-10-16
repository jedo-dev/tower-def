import { describe, expect, it } from 'vitest';
import { DamageType, EffectId } from '../../../shared/types/content-ids';
import {
  CreatureDamageShape,
  type CreatureAbilities,
} from '../../../shared/types/creatureAbilities';
import { createCreepAbilityRuntime } from './abilities';
import { applyDamageToCreep } from './damage';
import { applyEffectToCreep, findActiveEffect } from './effects';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';

function createCreep(abilities?: CreatureAbilities, overrides: Partial<CreepEntity> = {}) {
  const creep: CreepEntity = {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: 'creep:test',
    type: 'basic',
    hp: 100,
    maxHp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...(abilities === undefined ? {} : { abilities, ...createCreepAbilityRuntime(abilities, 10) }),
    ...overrides,
  };
  return creep;
}

describe('incomingDamageMultipliers', () => {
  const creep = createCreep({
    incomingDamageMultipliers: { splash: 0.5, chain: 2, dot: 0, percent: 0.5 },
  });

  it('scales damage by the shape it arrived as', () => {
    const hit = (shape?: CreatureDamageShape) =>
      applyDamageToCreep(creep, 20, DamageType.PHYSICAL, shape).damageApplied;

    expect(hit(CreatureDamageShape.SPLASH)).toBe(10);
    expect(hit(CreatureDamageShape.CHAIN)).toBe(40);
    expect(hit(CreatureDamageShape.SINGLE)).toBe(20);
    expect(hit(CreatureDamageShape.DOT)).toBe(0);
    expect(hit(undefined)).toBe(20);
  });

  it('multiplies the percent multiplier with the shape one', () => {
    // 100 permille of 100 maximum health is 10, halved by percent and by splash.
    const result = applyDamageToCreep(creep, 100, DamageType.PERCENT, CreatureDamageShape.SPLASH);
    expect(result.damageApplied).toBe(2.5);
  });

  it('leaves a creature without the ability untouched', () => {
    const plain = createCreep();
    expect(
      applyDamageToCreep(plain, 20, DamageType.PHYSICAL, CreatureDamageShape.SPLASH).damageApplied,
    ).toBe(20);
  });
});

describe('shield', () => {
  it('absorbs damage before health and restarts the recharge timer', () => {
    const creep = createCreep({ shieldHp: 30, shieldRechargeMs: 1_000 }, { msSinceDamage: 900 });

    const first = applyDamageToCreep(creep, 20, DamageType.MAGICAL);
    expect(first.creep.hp).toBe(100);
    expect(first.creep.shieldHp).toBe(10);
    expect(first.creep.msSinceDamage).toBe(0);
    expect(first.damageApplied).toBe(0);

    const second = applyDamageToCreep(first.creep, 25, DamageType.MAGICAL);
    expect(second.creep.shieldHp).toBe(0);
    expect(second.creep.hp).toBe(85);
    expect(second.damageApplied).toBe(15);
  });
});

describe('secondLife', () => {
  it('revives once at the health share, then dies for good', () => {
    const creep = createCreep({ secondLife: { hpShare: 0.4 } }, { hp: 10 });

    const first = applyDamageToCreep(creep, 50, DamageType.PHYSICAL);
    expect(first.killed).toBe(false);
    expect(first.revived).toBe(true);
    expect(first.damageApplied).toBe(10);
    expect(first.creep).toMatchObject({
      hp: 40,
      status: 'alive',
      lifeState: 'alive',
      isOnSecondLife: true,
    });

    const second = applyDamageToCreep(first.creep, 50, DamageType.PHYSICAL);
    expect(second.killed).toBe(true);
    expect(second.revived).toBeUndefined();
    expect(second.creep.status).toBe('dead');
  });

  it('drops a running chill when the second life is immune to it', () => {
    const chilled = applyEffectToCreep(
      createCreep({ secondLife: { hpShare: 0.5, immuneToChill: true } }, { hp: 5 }),
      { effectId: EffectId.CHILL },
    );
    const poisoned = applyEffectToCreep(chilled, { effectId: EffectId.POISON });

    const result = applyDamageToCreep(poisoned, 50, DamageType.PHYSICAL);

    expect(findActiveEffect(result.creep, EffectId.CHILL)).toBeUndefined();
    expect(findActiveEffect(result.creep, EffectId.POISON)).toBeDefined();
  });

  it('lets a creature without it die on the first lethal hit', () => {
    const result = applyDamageToCreep(createCreep(undefined, { hp: 5 }), 50, DamageType.PHYSICAL);
    expect(result).toEqual({ creep: result.creep, damageApplied: 5, killed: true });
  });
});
