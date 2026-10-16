import {
  resolveEffectArmorKind,
  resolveEffectDamageScope,
  resolveEffectDefinition,
  resolveEffectMaxStacks,
  type EffectDefinition,
} from '../../../shared/constants/effects';
import {
  EffectId,
  EffectStackingRule,
  type ArmorKind,
  type DamageScope,
  type DamageType,
} from '../../../shared/types/content-ids';
import { resistEffectInput } from './effectResistance';
import { getActiveEffects } from './effectTicks';
import type { ActiveEffect, CreepEntity } from './types';

export {
  getActiveEffects,
  hasEffectDamage,
  resolveActiveEffectDamageType,
  tickCreepEffects,
  type CreepEffectTickResult,
  type EffectDamageByType,
} from './effectTicks';
export { getEffectiveSpeedMultiplier } from './effectSpeed';

export type ApplyEffectInput = {
  effectId: EffectId;
  /** Overrides the balance magnitude, letting a tower level scale its effect. */
  magnitude?: number;
  /** Overrides the balance duration. */
  durationMs?: number;
  /** Stack cap of this application; the balance cap when absent (`resolveEffectMaxStacks`). */
  maxStacks?: number;
  /** Damage over time only: the type its ticks deal; `DAMAGE_OVER_TIME_DAMAGE_TYPE` when absent. */
  damageType?: DamageType;
  /** Armor break only: which armor it lowers; the definition's (`both`) when absent. */
  armorKind?: ArmorKind;
  /** Vulnerability only: which hits it amplifies; the definition's (`all`) when absent. */
  damageScope?: DamageScope;
  /**
   * Chill only: every `freezeAtStacks`-th chilling hit on the creep (counted
   * while the chill runs) freezes it - a stun of `freezeMs`.
   */
  freezeAtStacks?: number;
  freezeMs?: number;
};

export function findActiveEffect(creep: CreepEntity, effectId: EffectId): ActiveEffect | undefined {
  return getActiveEffects(creep).find((effect) => effect.id === effectId);
}

/**
 * Whether a running effect is the instance an application merges into: the
 * same id and, for armor break and vulnerability, the same armor or damage
 * scope (a physical and a magical break run side by side).
 */
function isSameEffectInstance(effect: ActiveEffect, input: ApplyEffectInput): boolean {
  if (effect.id !== input.effectId) {
    return false;
  }

  const definitionArmor = resolveEffectArmorKind(effect.id);
  const definitionScope = resolveEffectDamageScope(effect.id);

  return (
    (effect.armorKind ?? definitionArmor) === (input.armorKind ?? definitionArmor) &&
    (effect.damageScope ?? definitionScope) === (input.damageScope ?? definitionScope)
  );
}

function createEffect(definition: EffectDefinition, input: ApplyEffectInput): ActiveEffect {
  return {
    id: definition.id,
    magnitude: input.magnitude ?? definition.magnitude,
    remainingMs: input.durationMs ?? definition.durationMs,
    stacks: 1,
    maxStacks: resolveEffectMaxStacks(definition.id, input.maxStacks),
    nextTickInMs: definition.tickIntervalMs,
    ...(input.damageType === undefined ? {} : { damageType: input.damageType }),
    ...(input.armorKind === undefined ? {} : { armorKind: input.armorKind }),
    ...(input.damageScope === undefined ? {} : { damageScope: input.damageScope }),
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
      // The running instance keeps the highest cap any contributor authored:
      // upgrading one poison tower lifts the ceiling instead of being ignored
      // by the older stacks, and a no-stack tower never cuts another's stacks.
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
      return incoming.magnitude > existing.magnitude
        ? withFreezeCharge(incoming, existing.freezeCharge)
        : undefined;
  }
}

function withFreezeCharge(effect: ActiveEffect, freezeCharge: number | undefined): ActiveEffect {
  return freezeCharge === undefined ? effect : { ...effect, freezeCharge };
}

function replaceEffect(
  creep: CreepEntity,
  previous: ActiveEffect,
  next: ActiveEffect,
): CreepEntity {
  return {
    ...creep,
    activeEffects: getActiveEffects(creep).map((effect) => (effect === previous ? next : effect)),
  };
}

/**
 * Counts one freezing hit on the chill instance the application landed on;
 * the `freezeAtStacks`-th one resets the count and stuns for `freezeMs`.
 * A weaker chill that changed nothing still counts.
 */
function applyFreezeCharge(
  creep: CreepEntity,
  input: ApplyEffectInput,
  freezeAtStacks: number,
): CreepEntity {
  const chill = getActiveEffects(creep).find((effect) => isSameEffectInstance(effect, input));

  if (!chill) {
    return creep;
  }

  const charge = (chill.freezeCharge ?? 0) + 1;

  if (charge < freezeAtStacks) {
    return replaceEffect(creep, chill, { ...chill, freezeCharge: charge });
  }

  const reset = replaceEffect(creep, chill, { ...chill, freezeCharge: 0 });
  return applyEffectToCreep(reset, {
    effectId: EffectId.STUN,
    ...(input.freezeMs === undefined ? {} : { durationMs: input.freezeMs }),
  });
}

function applyEffectInstance(creep: CreepEntity, input: ApplyEffectInput): CreepEntity {
  const definition = resolveEffectDefinition(input.effectId);
  const effects = getActiveEffects(creep);
  const existing = effects.find((effect) => isSameEffectInstance(effect, input));

  if (!existing) {
    return {
      ...creep,
      activeEffects: [...effects, createEffect(definition, input)],
    };
  }

  const merged = mergeEffect(existing, definition, input);

  return merged ? replaceEffect(creep, existing, merged) : creep;
}

/**
 * Returns the creep carrying the effect. The input creep is never mutated: a
 * changed effect list is always a fresh array, so render state can keep the
 * previous entity around for comparison.
 */
export function applyEffectToCreep(
  creep: CreepEntity,
  authoredInput: ApplyEffectInput,
): CreepEntity {
  // The creature's effect resistance weakens (or blocks) the application.
  const input = resistEffectInput(creep, authoredInput);

  if (input === undefined) {
    return creep;
  }

  const applied = applyEffectInstance(creep, input);

  if (input.freezeAtStacks === undefined || input.effectId !== EffectId.CHILL) {
    return applied;
  }

  return applyFreezeCharge(applied, input, input.freezeAtStacks);
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
