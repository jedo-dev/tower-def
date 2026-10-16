import type { UnitConfig } from '../../../unit/model/types';
import {
  computeMixedEffectiveHealth,
  EVEN_DAMAGE_MIX,
  type DamageTypeMix,
} from '../damage-profile';

/**
 * Raw damage it takes to kill `unit` when it is shot with `mix`, each damage
 * type through the combat rule: its physical armor against the physical
 * share, its magical armor against the magical share, its maximum health
 * against the percent share. `healthMultiplier` grows the unit to the wave it
 * spawns in. Without a mix, physical and magical count alike.
 */
export function computeEffectiveHealth(
  unit: Pick<UnitConfig, 'health' | 'physicalArmor' | 'magicalArmor'>,
  mix: DamageTypeMix = EVEN_DAMAGE_MIX,
  healthMultiplier = 1,
): number {
  return computeMixedEffectiveHealth(
    {
      health: unit.health * healthMultiplier,
      physicalArmor: unit.physicalArmor,
      magicalArmor: unit.magicalArmor,
    },
    mix,
  );
}
