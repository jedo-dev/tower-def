import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectId } from '../../../shared/types/content-ids';
import { getEffectResistanceMultiplier } from './abilities';
import type { ApplyEffectInput } from './effects';
import type { CreepEntity } from './types';

/**
 * The effect application after the creep's `effectResistance`: undefined when
 * the creep is immune (multiplier 0), the input itself when it does not resist.
 * Stun has no strength to weaken, so its duration shrinks; every other effect
 * (chill, poison, burn, armor break, vulnerability) keeps its duration and
 * loses magnitude.
 */
export function resistEffectInput(
  creep: CreepEntity,
  input: ApplyEffectInput,
): ApplyEffectInput | undefined {
  if (creep.abilities === undefined) {
    return input;
  }

  const multiplier = getEffectResistanceMultiplier(creep, input.effectId);

  if (multiplier >= 1) {
    return input;
  }
  if (multiplier <= 0) {
    return undefined;
  }

  const definition = resolveEffectDefinition(input.effectId);

  if (input.effectId === EffectId.STUN) {
    return { ...input, durationMs: (input.durationMs ?? definition.durationMs) * multiplier };
  }

  return { ...input, magnitude: (input.magnitude ?? definition.magnitude) * multiplier };
}
