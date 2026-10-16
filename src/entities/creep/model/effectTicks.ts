import { resolveEffectDefinition, type EffectDefinition } from '../../../shared/constants/effects';
import { DAMAGE_OVER_TIME_DAMAGE_TYPE } from '../../../shared/constants/damage';
import { DamageType, EffectId } from '../../../shared/types/content-ids';
import type { ActiveEffect, CreepEntity } from './types';

const NO_EFFECTS: readonly ActiveEffect[] = [];
const NO_EXPIRED: readonly EffectId[] = [];

/** Raw tick damage per damage type, before armor; percent amounts are ‰ of maximum health. */
export type EffectDamageByType = Readonly<Record<DamageType, number>>;

const NO_EFFECT_DAMAGE: EffectDamageByType = {
  [DamageType.PHYSICAL]: 0,
  [DamageType.MAGICAL]: 0,
  [DamageType.PERCENT]: 0,
};

export type CreepEffectTickResult = {
  /** Same reference as the input when nothing changed this frame. */
  creep: CreepEntity;
  /**
   * Damage the caller must apply, split by damage type so each part meets the
   * matching armor (or none, for percent); the helper never touches hit points.
   */
  damageByType: EffectDamageByType;
  expired: readonly EffectId[];
};

export function getActiveEffects(creep: CreepEntity): readonly ActiveEffect[] {
  return creep.activeEffects ?? NO_EFFECTS;
}

/** Damage type the ticks of a running effect deal. */
export function resolveActiveEffectDamageType(effect: ActiveEffect): DamageType {
  return effect.damageType ?? DAMAGE_OVER_TIME_DAMAGE_TYPE;
}

/** Whether a tick result carries any damage at all. */
export function hasEffectDamage(damageByType: EffectDamageByType): boolean {
  return (
    damageByType[DamageType.PHYSICAL] > 0 ||
    damageByType[DamageType.MAGICAL] > 0 ||
    damageByType[DamageType.PERCENT] > 0
  );
}

function tickSingleEffect(
  effect: ActiveEffect,
  definition: EffectDefinition,
  deltaMs: number,
): { effect: ActiveEffect; damage: number; expired: boolean } {
  const aliveMs = Math.min(deltaMs, effect.remainingMs);
  let damage = 0;
  let nextTickInMs = effect.nextTickInMs;

  if (definition.tickIntervalMs > 0) {
    let remainingWindowMs = aliveMs;

    while (remainingWindowMs >= nextTickInMs) {
      remainingWindowMs -= nextTickInMs;
      damage += effect.magnitude * effect.stacks;
      nextTickInMs = definition.tickIntervalMs;
    }

    nextTickInMs -= remainingWindowMs;
  }

  const remainingMs = effect.remainingMs - deltaMs;

  return {
    effect: { ...effect, remainingMs, nextTickInMs },
    damage,
    expired: remainingMs <= 0,
  };
}

/**
 * Advances every effect on the creep by `deltaMs`. Damage over time is
 * reported, never applied: the caller routes it through the normal damage path
 * so kill rewards and feedback stay in one place.
 */
export function tickCreepEffects(creep: CreepEntity, deltaMs: number): CreepEffectTickResult {
  const effects = getActiveEffects(creep);

  if (effects.length === 0 || deltaMs <= 0) {
    return { creep, damageByType: NO_EFFECT_DAMAGE, expired: NO_EXPIRED };
  }

  const surviving: ActiveEffect[] = [];
  let expired: EffectId[] | undefined;
  let physicalDamage = 0;
  let magicalDamage = 0;
  let percentDamage = 0;

  for (const effect of effects) {
    const result = tickSingleEffect(effect, resolveEffectDefinition(effect.id), deltaMs);

    if (result.damage > 0) {
      const damageType = resolveActiveEffectDamageType(effect);

      if (damageType === DamageType.PHYSICAL) {
        physicalDamage += result.damage;
      } else if (damageType === DamageType.PERCENT) {
        percentDamage += result.damage;
      } else {
        magicalDamage += result.damage;
      }
    }

    if (result.expired) {
      expired ??= [];
      expired.push(effect.id);
      continue;
    }

    surviving.push(result.effect);
  }

  const hasDamage = physicalDamage > 0 || magicalDamage > 0 || percentDamage > 0;

  return {
    creep: { ...creep, activeEffects: surviving },
    damageByType: hasDamage
      ? {
          [DamageType.PHYSICAL]: physicalDamage,
          [DamageType.MAGICAL]: magicalDamage,
          [DamageType.PERCENT]: percentDamage,
        }
      : NO_EFFECT_DAMAGE,
    expired: expired ?? NO_EXPIRED,
  };
}
