import { describe, expect, it } from 'vitest';
import { applyEffectToCreep, findActiveEffect, getActiveEffects } from './effects';
import { getEffectiveArmor, getVulnerabilityMultiplier, resolveIncomingDamage } from './damage';
import { getEffectiveSpeedMultiplier } from './effectSpeed';
import { tickCreepEffects } from './effectTicks';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from './types';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { ArmorKind, DamageScope, DamageType, EffectId } from '../../../shared/types/content-ids';

function createCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    ...DEFAULT_CREEP_COMBAT_TRAITS,
    id: 'creep:test',
    type: 'basic',
    hp: 1_000,
    maxHp: 1_000,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 0, y: 0 },
    pathIndex: 0,
    ...overrides,
  };
}

describe('armor break instances', () => {
  it('keeps breaks of different armor kinds side by side', () => {
    let creep = createCreep({ physicalArmor: 10, magicalArmor: 10 });
    creep = applyEffectToCreep(creep, {
      effectId: EffectId.ARMOR_BREAK,
      magnitude: 3,
      armorKind: ArmorKind.PHYSICAL,
    });
    creep = applyEffectToCreep(creep, {
      effectId: EffectId.ARMOR_BREAK,
      magnitude: 5,
      armorKind: ArmorKind.MAGICAL,
    });

    expect(getActiveEffects(creep)).toHaveLength(2);
    expect(getEffectiveArmor(creep, ArmorKind.PHYSICAL)).toBe(7);
    expect(getEffectiveArmor(creep, ArmorKind.MAGICAL)).toBe(5);
  });

  it('stacks a break of the same kind, and an explicit both merges with the default', () => {
    let creep = createCreep({ physicalArmor: 10 });
    creep = applyEffectToCreep(creep, { effectId: EffectId.ARMOR_BREAK, magnitude: 2 });
    creep = applyEffectToCreep(creep, {
      effectId: EffectId.ARMOR_BREAK,
      magnitude: 2,
      armorKind: ArmorKind.BOTH,
    });

    expect(getActiveEffects(creep)).toHaveLength(1);
    expect(findActiveEffect(creep, EffectId.ARMOR_BREAK)?.stacks).toBe(2);
    expect(getEffectiveArmor(creep, ArmorKind.PHYSICAL)).toBe(6);
  });
});

describe('vulnerability', () => {
  it('amplifies only the damage types its scope covers', () => {
    const creep = applyEffectToCreep(createCreep(), {
      effectId: EffectId.VULNERABILITY,
      magnitude: 0.25,
      damageScope: DamageScope.MAGICAL,
    });

    expect(getVulnerabilityMultiplier(creep, DamageType.MAGICAL)).toBe(1.25);
    expect(getVulnerabilityMultiplier(creep, DamageType.PHYSICAL)).toBe(1);
    expect(resolveIncomingDamage(creep, 100, DamageType.MAGICAL)).toBe(125);
    expect(resolveIncomingDamage(creep, 100, DamageType.PHYSICAL)).toBe(100);
  });

  it('defaults to every type, percent included, and adds up across scopes', () => {
    let creep = applyEffectToCreep(createCreep(), { effectId: EffectId.VULNERABILITY });
    creep = applyEffectToCreep(creep, {
      effectId: EffectId.VULNERABILITY,
      magnitude: 0.1,
      damageScope: DamageScope.PERCENT,
    });
    const defaultShare = resolveEffectDefinition(EffectId.VULNERABILITY).magnitude;

    expect(getVulnerabilityMultiplier(creep, DamageType.PHYSICAL)).toBeCloseTo(1 + defaultShare);
    expect(getVulnerabilityMultiplier(creep, DamageType.PERCENT)).toBeCloseTo(
      1 + defaultShare + 0.1,
    );
  });

  it('refreshes rather than stacks, keeping the stronger share', () => {
    let creep = applyEffectToCreep(createCreep(), {
      effectId: EffectId.VULNERABILITY,
      magnitude: 0.3,
    });
    creep = tickCreepEffects(creep, 1_000).creep;
    creep = applyEffectToCreep(creep, { effectId: EffectId.VULNERABILITY, magnitude: 0.1 });

    const effect = findActiveEffect(creep, EffectId.VULNERABILITY);
    expect(effect).toMatchObject({ magnitude: 0.3, stacks: 1 });
    expect(effect?.remainingMs).toBe(resolveEffectDefinition(EffectId.VULNERABILITY).durationMs);
  });

  it('leaves damage untouched once it expires', () => {
    let creep = applyEffectToCreep(createCreep(), {
      effectId: EffectId.VULNERABILITY,
      durationMs: 100,
    });
    creep = tickCreepEffects(creep, 100).creep;

    expect(resolveIncomingDamage(creep, 100, DamageType.PHYSICAL)).toBe(100);
  });
});

describe('chill freeze', () => {
  const freezingChill = {
    effectId: EffectId.CHILL,
    magnitude: 0.3,
    freezeAtStacks: 2,
    freezeMs: 600,
  } as const;

  it('counts freezing hits, weaker ones included, and stuns on the Nth', () => {
    let creep = applyEffectToCreep(createCreep(), freezingChill);
    expect(findActiveEffect(creep, EffectId.CHILL)?.freezeCharge).toBe(1);

    creep = applyEffectToCreep(creep, { ...freezingChill, magnitude: 0.1 });

    expect(findActiveEffect(creep, EffectId.STUN)?.remainingMs).toBe(600);
    expect(findActiveEffect(creep, EffectId.CHILL)).toMatchObject({
      magnitude: 0.3,
      freezeCharge: 0,
    });
    expect(getEffectiveSpeedMultiplier(creep)).toBe(0);
  });

  it('keeps the charge when a stronger chill replaces the instance', () => {
    let creep = applyEffectToCreep(createCreep(), { ...freezingChill, freezeAtStacks: 3 });
    creep = applyEffectToCreep(creep, { ...freezingChill, freezeAtStacks: 3, magnitude: 0.5 });

    expect(findActiveEffect(creep, EffectId.CHILL)).toMatchObject({
      magnitude: 0.5,
      freezeCharge: 2,
    });
  });

  it('starts counting afresh after the chill wears off', () => {
    let creep = applyEffectToCreep(createCreep(), freezingChill);
    creep = tickCreepEffects(creep, resolveEffectDefinition(EffectId.CHILL).durationMs).creep;
    creep = applyEffectToCreep(creep, freezingChill);

    expect(findActiveEffect(creep, EffectId.STUN)).toBeUndefined();
    expect(findActiveEffect(creep, EffectId.CHILL)?.freezeCharge).toBe(1);
  });

  it('a freeze field on any other effect changes nothing', () => {
    const creep = applyEffectToCreep(createCreep(), {
      effectId: EffectId.POISON,
      freezeAtStacks: 1,
    });

    expect(findActiveEffect(creep, EffectId.STUN)).toBeUndefined();
    expect(findActiveEffect(creep, EffectId.POISON)?.freezeCharge).toBeUndefined();
  });
});
