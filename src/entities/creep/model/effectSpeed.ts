import { EFFECT_BALANCE, resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectKind } from '../../../shared/types/content-ids';
import { getActiveEffects } from './effectTicks';
import type { CreepEntity } from './types';

/**
 * Speed scale from movement effects. Slows do not add up - the strongest one
 * wins - and no slow can take a creep below the balance floor, but a stun
 * (or a chill freeze, which is a stun) stops it outright.
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
