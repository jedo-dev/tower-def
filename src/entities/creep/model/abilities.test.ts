import { describe, expect, it } from 'vitest';
import { EffectId } from '../../../shared/types/content-ids';
import type { CreatureAbilities } from '../../../shared/types/creatureAbilities';
import {
  createCreepAbilityRuntime,
  getAbilitySpeedMultiplier,
  getCreepLeakLives,
  getEffectResistanceMultiplier,
  isCreepHidden,
  tickCreepAbilities,
} from './abilities';
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
    remainingRouteDistance: 20,
    ...(abilities === undefined ? {} : { abilities, ...createCreepAbilityRuntime(abilities, 20) }),
    ...overrides,
  };
  return creep;
}

describe('creature abilities absent', () => {
  it('change nothing', () => {
    const creep = createCreep(undefined, { hp: 50 });
    tickCreepAbilities(creep, 1_000);

    expect(creep.hp).toBe(50);
    expect(isCreepHidden(creep)).toBe(false);
    expect(getAbilitySpeedMultiplier(creep)).toBe(1);
    expect(getEffectResistanceMultiplier(creep, EffectId.CHILL)).toBe(1);
    expect(getCreepLeakLives(creep)).toBe(1);
    expect(createCreepAbilityRuntime(undefined, 10)).toEqual({});
  });
});

describe('startInvisibleMs', () => {
  it('hides the creep until the time runs out', () => {
    const creep = createCreep({ startInvisibleMs: 1_000 });
    expect(isCreepHidden(creep)).toBe(true);

    tickCreepAbilities(creep, 600);
    expect(isCreepHidden(creep)).toBe(true);

    tickCreepAbilities(creep, 400);
    expect(isCreepHidden(creep)).toBe(false);
  });
});

describe('healthRegenPerSecond', () => {
  it('heals per second, capped at maximum health', () => {
    const creep = createCreep({ healthRegenPerSecond: 10 }, { hp: 80 });
    tickCreepAbilities(creep, 500);
    expect(creep.hp).toBe(85);

    tickCreepAbilities(creep, 5_000);
    expect(creep.hp).toBe(100);
  });

  it('keeps healing under poison unless regenPausedByPoison', () => {
    const poisoned = (abilities: CreatureAbilities) =>
      applyEffectToCreep(createCreep(abilities, { hp: 50 }), { effectId: EffectId.POISON });

    const keepsHealing = poisoned({ healthRegenPerSecond: 10 });
    tickCreepAbilities(keepsHealing, 1_000);
    expect(keepsHealing.hp).toBe(60);

    const paused = poisoned({ healthRegenPerSecond: 10, regenPausedByPoison: true });
    tickCreepAbilities(paused, 1_000);
    expect(paused.hp).toBe(50);
  });

  it('does not raise the dead', () => {
    const creep = createCreep(
      { healthRegenPerSecond: 10 },
      { hp: 0, status: 'dead', lifeState: 'dead' },
    );
    tickCreepAbilities(creep, 1_000);
    expect(creep.hp).toBe(0);
  });
});

describe('shield recharge', () => {
  it('refills only after shieldRechargeMs without damage', () => {
    const creep = createCreep({ shieldHp: 40, shieldRechargeMs: 2_000 }, { shieldHp: 5 });
    tickCreepAbilities(creep, 1_500);
    expect(creep.shieldHp).toBe(5);

    tickCreepAbilities(creep, 500);
    expect(creep.shieldHp).toBe(40);
  });

  it('never refills without shieldRechargeMs', () => {
    const creep = createCreep({ shieldHp: 40 }, { shieldHp: 0 });
    tickCreepAbilities(creep, 60_000);
    expect(creep.shieldHp).toBe(0);
  });
});

describe('speed abilities', () => {
  it('speedBoostBelowHpShare applies at or below the health share', () => {
    const abilities = { speedBoostBelowHpShare: { hpShare: 0.5, speedMultiplier: 1.5 } };
    expect(getAbilitySpeedMultiplier(createCreep(abilities, { hp: 51 }))).toBe(1);
    expect(getAbilitySpeedMultiplier(createCreep(abilities, { hp: 50 }))).toBe(1.5);
  });

  it('speedBoostLastRouteShare applies on the last share of the route', () => {
    const abilities = { speedBoostLastRouteShare: { routeShare: 0.25, speedMultiplier: 2 } };
    expect(getAbilitySpeedMultiplier(createCreep(abilities, { remainingRouteDistance: 6 }))).toBe(
      1,
    );
    expect(getAbilitySpeedMultiplier(createCreep(abilities, { remainingRouteDistance: 5 }))).toBe(
      2,
    );
  });

  it('multiplies every boost, the second life included', () => {
    const creep = createCreep(
      {
        speedBoostBelowHpShare: { hpShare: 0.5, speedMultiplier: 1.5 },
        speedBoostLastRouteShare: { routeShare: 0.5, speedMultiplier: 2 },
        secondLife: { hpShare: 0.3, speedMultiplier: 0.5 },
      },
      { hp: 10, remainingRouteDistance: 1, isOnSecondLife: true },
    );
    expect(getAbilitySpeedMultiplier(creep)).toBe(1.5);
  });
});

describe('effectResistance', () => {
  it('reads the authored multiplier, 1 when omitted', () => {
    const creep = createCreep({ effectResistance: { chill: 0.5, stun: 0 } });
    expect(getEffectResistanceMultiplier(creep, EffectId.CHILL)).toBe(0.5);
    expect(getEffectResistanceMultiplier(creep, EffectId.STUN)).toBe(0);
    expect(getEffectResistanceMultiplier(creep, EffectId.POISON)).toBe(1);
  });

  it('weakens magnitude, shortens a stun and blocks an immune effect', () => {
    const creep = createCreep({ effectResistance: { chill: 0.5, stun: 0.5, poison: 0 } });

    const chilled = applyEffectToCreep(creep, { effectId: EffectId.CHILL, magnitude: 0.4 });
    expect(findActiveEffect(chilled, EffectId.CHILL)).toMatchObject({
      magnitude: 0.2,
      remainingMs: 2_000,
    });

    const stunned = applyEffectToCreep(creep, { effectId: EffectId.STUN });
    expect(findActiveEffect(stunned, EffectId.STUN)).toMatchObject({
      magnitude: 1,
      remainingMs: 350,
    });

    expect(applyEffectToCreep(creep, { effectId: EffectId.POISON })).toBe(creep);
  });

  it('makes a chill-immune second life shrug off chill', () => {
    const creep = createCreep(
      { secondLife: { hpShare: 0.5, immuneToChill: true } },
      { isOnSecondLife: true },
    );
    expect(applyEffectToCreep(creep, { effectId: EffectId.CHILL })).toBe(creep);
  });
});

describe('leakLivesTaken', () => {
  it('is the lives one leak takes', () => {
    expect(getCreepLeakLives(createCreep({ leakLivesTaken: 3 }))).toBe(3);
  });
});
