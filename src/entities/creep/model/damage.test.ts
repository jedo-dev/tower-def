import { describe, expect, it } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS } from './types';
import {
  applyDamageToCreep,
  armorKindCovers,
  calculateMitigatedDamage,
  getArmorDamageMultiplier,
  getEffectiveArmor,
} from './damage';
import { applyEffectToCreep, tickCreepEffects } from './effects';
import {
  ARMOR_BOUNDS,
  DAMAGE_MITIGATION,
  DAMAGE_OVER_TIME_DAMAGE_TYPE,
} from '../../../shared/constants/damage';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { ArmorKind, DamageType, EffectId } from '../../../shared/types/content-ids';
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
    const result = applyDamageToCreep(creep, 25, DamageType.PHYSICAL);

    expect(result.damageApplied).toBe(25);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(65);
    expect(result.creep.lifeState).toBe('alive');
    expect(result.creep.status).toBe('alive');
  });

  it('kills creep when damage reaches remaining hp', () => {
    const creep = createCreep({ hp: 30 });
    const result = applyDamageToCreep(creep, 30, DamageType.PHYSICAL);

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
    const result = applyDamageToCreep(deadCreep, 50, DamageType.PHYSICAL);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep).toEqual(deadCreep);
  });

  it('caps applied damage to current hp on overkill', () => {
    const creep = createCreep({ hp: 10 });
    const result = applyDamageToCreep(creep, 999, DamageType.PHYSICAL);

    expect(result.damageApplied).toBe(10);
    expect(result.killed).toBe(true);
    expect(result.creep.hp).toBe(0);
  });

  it('ignores negative damage values', () => {
    const creep = createCreep({ hp: 80 });
    const result = applyDamageToCreep(creep, -25, DamageType.PHYSICAL);

    expect(result.damageApplied).toBe(0);
    expect(result.killed).toBe(false);
    expect(result.creep.hp).toBe(80);
    expect(result.creep.lifeState).toBe('alive');
  });
});

describe('armor mitigation', () => {
  const RAW_DAMAGE = 100;

  it('lets a hit land in full against a creep without armor', () => {
    const creep = createCreep({ physicalArmor: 0, magicalArmor: 0 });

    expect(getEffectiveArmor(creep, ArmorKind.PHYSICAL)).toBe(0);
    expect(applyDamageToCreep(creep, RAW_DAMAGE, DamageType.PHYSICAL).damageApplied).toBe(
      RAW_DAMAGE,
    );
    expect(applyDamageToCreep(creep, RAW_DAMAGE, DamageType.MAGICAL).damageApplied).toBe(
      RAW_DAMAGE,
    );
  });

  it('removes a growing share of a hit as armor rises', () => {
    const lowArmor = calculateMitigatedDamage(RAW_DAMAGE, 3);
    const highArmor = calculateMitigatedDamage(RAW_DAMAGE, 10);

    expect(lowArmor).toBeLessThan(RAW_DAMAGE);
    expect(highArmor).toBeLessThan(lowArmor);
    expect(lowArmor).toBeCloseTo(84.7, 1);
    expect(highArmor).toBeCloseTo(62.5, 1);
  });

  it('amplifies a hit against negative armor by the share the same positive armor removes', () => {
    const removedAtTen = RAW_DAMAGE - calculateMitigatedDamage(RAW_DAMAGE, 10);

    expect(calculateMitigatedDamage(RAW_DAMAGE, -10)).toBeCloseTo(RAW_DAMAGE + removedAtTen, 9);
    expect(calculateMitigatedDamage(RAW_DAMAGE, -3)).toBeCloseTo(115.3, 1);
  });

  it('caps amplification at the lower armor bound', () => {
    const atBound = calculateMitigatedDamage(RAW_DAMAGE, ARMOR_BOUNDS.min);

    expect(atBound).toBeCloseTo(160, 9);
    expect(calculateMitigatedDamage(RAW_DAMAGE, ARMOR_BOUNDS.min - 100)).toBe(atBound);
  });

  it('never mitigates a hit below the damage floor', () => {
    expect(getArmorDamageMultiplier(ARMOR_BOUNDS.max)).toBeGreaterThanOrEqual(
      DAMAGE_MITIGATION.minimumDamageFraction,
    );
    expect(calculateMitigatedDamage(RAW_DAMAGE, 10_000)).toBe(
      calculateMitigatedDamage(RAW_DAMAGE, ARMOR_BOUNDS.max),
    );
  });

  it('mitigates each damage type with its own armor', () => {
    const creep = createCreep({ hp: 1000, physicalArmor: 10, magicalArmor: -10 });

    expect(applyDamageToCreep(creep, RAW_DAMAGE, DamageType.PHYSICAL).damageApplied).toBeCloseTo(
      calculateMitigatedDamage(RAW_DAMAGE, 10),
      9,
    );
    expect(applyDamageToCreep(creep, RAW_DAMAGE, DamageType.MAGICAL).damageApplied).toBeCloseTo(
      calculateMitigatedDamage(RAW_DAMAGE, -10),
      9,
    );
  });

  it('takes a share of maximum health for percent damage, ignoring armor', () => {
    const creep = createCreep({ hp: 400, maxHp: 1000, physicalArmor: 75, magicalArmor: 75 });

    // Damage 30 of type percent is 3% of maximum health per hit.
    expect(applyDamageToCreep(creep, 30, DamageType.PERCENT).damageApplied).toBeCloseTo(30, 9);
    expect(applyDamageToCreep(createCreep({ hp: 200 }), 50, DamageType.PERCENT).damageApplied).toBe(
      10,
    );
  });

  it('lowers both armors while armor break runs and restores them on expiry', () => {
    const armored = createCreep({ physicalArmor: 6, magicalArmor: 4 });
    const broken = applyEffectToCreep(armored, { effectId: EffectId.ARMOR_BREAK });
    const magnitude = resolveEffectDefinition(EffectId.ARMOR_BREAK).magnitude;

    expect(getEffectiveArmor(broken, ArmorKind.PHYSICAL)).toBe(6 - magnitude);
    expect(getEffectiveArmor(broken, ArmorKind.MAGICAL)).toBe(4 - magnitude);
    expect(
      applyDamageToCreep(broken, RAW_DAMAGE, DamageType.PHYSICAL).damageApplied,
    ).toBeGreaterThan(applyDamageToCreep(armored, RAW_DAMAGE, DamageType.PHYSICAL).damageApplied);

    const definition = resolveEffectDefinition(EffectId.ARMOR_BREAK);
    const afterExpiry = tickCreepEffects(broken, definition.durationMs).creep;

    expect(getEffectiveArmor(afterExpiry, ArmorKind.PHYSICAL)).toBe(6);
    expect(getEffectiveArmor(afterExpiry, ArmorKind.MAGICAL)).toBe(4);
  });

  it('narrows an armor-changing effect to the armor its kind names', () => {
    expect(armorKindCovers(ArmorKind.BOTH, ArmorKind.PHYSICAL)).toBe(true);
    expect(armorKindCovers(ArmorKind.BOTH, ArmorKind.MAGICAL)).toBe(true);
    expect(armorKindCovers(ArmorKind.PHYSICAL, ArmorKind.PHYSICAL)).toBe(true);
    expect(armorKindCovers(ArmorKind.PHYSICAL, ArmorKind.MAGICAL)).toBe(false);
    expect(armorKindCovers(ArmorKind.MAGICAL, ArmorKind.PHYSICAL)).toBe(false);
  });

  it('stacks armor break into negative armor, never below the lower bound', () => {
    let creep = createCreep({ physicalArmor: 2, magicalArmor: ARMOR_BOUNDS.min + 1 });

    for (let application = 0; application < 5; application += 1) {
      creep = applyEffectToCreep(creep, { effectId: EffectId.ARMOR_BREAK });
    }

    const definition = resolveEffectDefinition(EffectId.ARMOR_BREAK);
    expect(getEffectiveArmor(creep, ArmorKind.PHYSICAL)).toBe(
      2 - definition.magnitude * definition.maxStacks,
    );
    expect(getEffectiveArmor(creep, ArmorKind.MAGICAL)).toBe(ARMOR_BOUNDS.min);
  });

  it('runs damage over time through magical armor: reduced when high, amplified when negative', () => {
    expect(DAMAGE_OVER_TIME_DAMAGE_TYPE).toBe(DamageType.MAGICAL);

    const warded = createCreep({ hp: 1000, physicalArmor: 0, magicalArmor: 20 });
    const cursed = createCreep({ hp: 1000, physicalArmor: 0, magicalArmor: -10 });

    expect(
      applyDamageToCreep(warded, RAW_DAMAGE, DAMAGE_OVER_TIME_DAMAGE_TYPE).damageApplied,
    ).toBeLessThan(RAW_DAMAGE);
    expect(
      applyDamageToCreep(cursed, RAW_DAMAGE, DAMAGE_OVER_TIME_DAMAGE_TYPE).damageApplied,
    ).toBeGreaterThan(RAW_DAMAGE);
  });
});
