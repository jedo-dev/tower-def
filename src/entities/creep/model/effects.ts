import {
  EFFECT_BALANCE,
  resolveEffectDefinition,
  type EffectDefinition,
} from '../../../shared/constants/effects';
import { DAMAGE_OVER_TIME_DAMAGE_TYPE } from '../../../shared/constants/damage';
import {
  DamageType,
  EffectId,
  EffectKind,
  EffectStackingRule,
} from '../../../shared/types/content-ids';
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

export type ApplyEffectInput = {
  effectId: EffectId;
  /** Overrides the balance magnitude, letting a tower level scale its effect. */
  magnitude?: number;
  /** Overrides the balance duration. */
  durationMs?: number;
  /** Raises the stack cap for this application; never lowers the balance cap. */
  maxStacks?: number;
  /** Damage over time only: the type its ticks deal; `DAMAGE_OVER_TIME_DAMAGE_TYPE` when absent. */
  damageType?: DamageType;
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

export function getActiveEffects(creep: CreepEntity): readonly ActiveEffect[] {
  return creep.activeEffects ?? NO_EFFECTS;
}

export function findActiveEffect(creep: CreepEntity, effectId: EffectId): ActiveEffect | undefined {
  return getActiveEffects(creep).find((effect) => effect.id === effectId);
}

function createEffect(definition: EffectDefinition, input: ApplyEffectInput): ActiveEffect {
  return {
    id: definition.id,
    magnitude: input.magnitude ?? definition.magnitude,
    remainingMs: input.durationMs ?? definition.durationMs,
    stacks: 1,
    maxStacks: Math.max(definition.maxStacks, input.maxStacks ?? definition.maxStacks),
    nextTickInMs: definition.tickIntervalMs,
    ...(input.damageType === undefined ? {} : { damageType: input.damageType }),
  };
}

/** The latest application decides the tick type, as it decides the remaining duration. */
function withIncomingDamageType(effect: ActiveEffect, incoming: ActiveEffect): ActiveEffect {
  if (effect.damageType === incoming.damageType) {
    return effect;
  }

  const { damageType: _previous, ...rest } = effect;
  return incoming.damageType === undefined ? rest : { ...rest, damageType: incoming.damageType };
}

function mergeEffect(
  existing: ActiveEffect,
  definition: EffectDefinition,
  input: ApplyEffectInput,
): ActiveEffect | undefined {
  const incoming = createEffect(definition, input);

  switch (definition.stackingRule) {
    case EffectStackingRule.STACK: {
      // The stronger tower also sets the cap, so upgrading one poison tower
      // lifts the ceiling instead of being ignored by the older stacks.
      const maxStacks = Math.max(existing.maxStacks, incoming.maxStacks);

      return withIncomingDamageType(
        {
          ...existing,
          magnitude: Math.max(existing.magnitude, incoming.magnitude),
          remainingMs: incoming.remainingMs,
          maxStacks,
          stacks: Math.min(existing.stacks + 1, maxStacks),
        },
        incoming,
      );
    }
    case EffectStackingRule.REFRESH:
      return withIncomingDamageType(
        {
          ...existing,
          magnitude: Math.max(existing.magnitude, incoming.magnitude),
          remainingMs: incoming.remainingMs,
        },
        incoming,
      );
    case EffectStackingRule.STRONGEST:
      // A weaker application is dropped outright, so a cheap tower cannot
      // overwrite an upgraded one with a shorter, softer slow.
      return incoming.magnitude > existing.magnitude ? incoming : undefined;
  }
}

/**
 * Returns the creep carrying the effect. The input creep is never mutated: a
 * changed effect list is always a fresh array, so render state can keep the
 * previous entity around for comparison.
 */
export function applyEffectToCreep(creep: CreepEntity, input: ApplyEffectInput): CreepEntity {
  const definition = resolveEffectDefinition(input.effectId);
  const effects = getActiveEffects(creep);
  const existing = effects.find((effect) => effect.id === input.effectId);

  if (!existing) {
    return {
      ...creep,
      activeEffects: [...effects, createEffect(definition, input)],
    };
  }

  const merged = mergeEffect(existing, definition, input);

  if (!merged) {
    return creep;
  }

  return {
    ...creep,
    activeEffects: effects.map((effect) => (effect.id === input.effectId ? merged : effect)),
  };
}

export function removeEffectFromCreep(creep: CreepEntity, effectId: EffectId): CreepEntity {
  const effects = getActiveEffects(creep);

  if (!effects.some((effect) => effect.id === effectId)) {
    return creep;
  }

  return {
    ...creep,
    activeEffects: effects.filter((effect) => effect.id !== effectId),
  };
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

/**
 * Speed scale from movement effects. Slows do not add up - the strongest one
 * wins - and no slow can take a creep below the balance floor, but a stun
 * stops it outright.
 */
export function getEffectiveSpeedMultiplier(creep: CreepEntity): number {
  const effects = getActiveEffects(creep);

  if (effects.length === 0) {
    return 1;
  }

  let strongestSlow = 0;

  for (const effect of effects) {
    if (resolveEffectDefinition(effect.id).kind !== EffectKind.MOVEMENT) {
      continue;
    }

    const slow = effect.magnitude * effect.stacks;

    if (slow >= 1) {
      return 0;
    }

    strongestSlow = Math.max(strongestSlow, slow);
  }

  if (strongestSlow === 0) {
    return 1;
  }

  return Math.max(EFFECT_BALANCE.minimumSpeedMultiplier, 1 - strongestSlow);
}
