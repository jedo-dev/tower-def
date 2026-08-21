import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from './types';
import { applyDamageToCreep, calculateMitigatedDamage, getEffectiveArmor } from './damage';
import { applyEffectToCreep, tickCreepEffects } from './effects';
import { ARMOR_TYPE_BONUS, DAMAGE_MITIGATION } from '../../../shared/constants/damage';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectId, UnitArmorType } from '../../../shared/types/content-ids';
import type { CreepEntity } from './types';

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: 'creep:test',
    type: 'basic',
    hp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...overrides,
  };
}

describe('applyDamageToCreep', () => {
  it('reduces hp for alive creep', () => {
    const creep = createCreep({ hp: 90 });
    const result = applyDamageToCreep(creep, 25);

    expect(result.damageApplied).toBe(25);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(65);
    expect(result.creep.lifeState).toBe('alive');
    expect(result.creep.status).toBe('alive');
  });

  it('kills creep when damage reaches remaining hp', () => {
    const creep = createCreep({ hp: 30 });
    const result = applyDamageToCreep(creep, 30);

    expect(result.damageApplied).toBe(30);
    expect(result.killed).toBe(true);
    expect(result.creep.hp).toBe(0);
    expect(result.creep.lifeState).toBe('dead');
    expect(result.creep.status).toBe('dead');
  });

  it('does not damage creep that is already dead', () => {
    const deadCreep = createCreep({
      hp: 0,
      lifeState: 'dead',
      status: 'dead',
    });
    const result = applyDamageToCreep(deadCreep, 50);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep).toEqual(deadCreep);
  });

  it('caps applied damage to current hp on overkill', () => {
    const creep = createCreep({ hp: 10 });
    const result = applyDamageToCreep(creep, 999);

    expect(result.damageApplied).toBe(10);
    expect(result.killed).toBe(true);
    expect(result.creep.hp).toBe(0);
  });

  it('ignores negative damage values', () => {
    const creep = createCreep({ hp: 80 });
    const result = applyDamageToCreep(creep, -25);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(80);
    expect(result.creep.lifeState).toBe('alive');
  });
});

describe('armor mitigation', () => {
  const RAW_DAMAGE = 100;

  it('lets a hit land in full against an unarmored target', () => {
    const creep = createCreep({ armor: 0, armorType: UnitArmorType.LIGHT });

    expect(getEffectiveArmor(creep)).toBe(0);
    expect(applyDamageToCreep(creep, RAW_DAMAGE).damageApplied).toBe(RAW_DAMAGE);
  });

  it('removes a growing share of a hit as armor rises', () => {
    const lowArmor = calculateMitigatedDamage(RAW_DAMAGE, 3);
    const highArmor = calculateMitigatedDamage(RAW_DAMAGE, 10);

    expect(lowArmor).toBeLessThan(RAW_DAMAGE);
    expect(highArmor).toBeLessThan(lowArmor);
    expect(lowArmor).toBeCloseTo(84.7, 1);
    expect(highArmor).toBeCloseTo(62.5, 1);
  });

  it('never mitigates a hit below the damage floor', () => {
    expect(calculateMitigatedDamage(RAW_DAMAGE, 10_000))
      .toBe(RAW_DAMAGE * DAMAGE_MITIGATION.minimumDamageFraction);
  });

  it('shifts effective armor by the armor class', () => {
    expect(getEffectiveArmor(createCreep({ armor: 3, armorType: UnitArmorType.HEAVY })))
      .toBe(3 + ARMOR_TYPE_BONUS[UnitArmorType.HEAVY]);
    expect(getEffectiveArmor(createCreep({ armor: 3, armorType: UnitArmorType.UNARMORED })))
      .toBe(3 + ARMOR_TYPE_BONUS[UnitArmorType.UNARMORED]);
    expect(getEffectiveArmor(createCreep({ armor: 0, armorType: UnitArmorType.UNARMORED }))).toBe(0);
  });

  it('lowers armor while armor break runs and restores it on expiry', () => {
    const armored = createCreep({ armor: 6, armorType: UnitArmorType.LIGHT });
    const broken = applyEffectToCreep(armored, { effectId: EffectId.ARMOR_BREAK });
    const brokenArmor = getEffectiveArmor(broken);

    expect(brokenArmor).toBeLessThan(getEffectiveArmor(armored));
    expect(applyDamageToCreep(broken, RAW_DAMAGE).damageApplied)
      .toBeGreaterThan(applyDamageToCreep(armored, RAW_DAMAGE).damageApplied);

    const definition = resolveEffectDefinition(EffectId.ARMOR_BREAK);
    const afterExpiry = tickCreepEffects(broken, definition.durationMs).creep;

    expect(getEffectiveArmor(afterExpiry)).toBe(getEffectiveArmor(armored));
  });

  it('stacks armor break down to the floor without going negative', () => {
    let creep = createCreep({ armor: 2, armorType: UnitArmorType.LIGHT });

    for (let application = 0; application < 5; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.ARMOR_BREAK });
    }

    expect(getEffectiveArmor(creep)).toBe(0);
  });

  it('lets damage over time bypass armor entirely', () => {
    const armored = createCreep({ armor: 10, armorType: UnitArmorType.HEAVY });

    expect(applyDamageToCreep(armored, RAW_DAMAGE, { ignoreArmor: true }).damageApplied)
      .toBe(RAW_DAMAGE);
    expect(applyDamageToCreep(armored, RAW_DAMAGE).damageApplied).toBeLessThan(RAW_DAMAGE);
  });
});
