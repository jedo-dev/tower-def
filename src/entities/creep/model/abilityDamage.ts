import { CREATURE_ABILITY_BALANCE } from '../../../shared/constants/creatureAbilities';
import { DamageType, EffectId } from '../../../shared/types/content-ids';
import type { CreatureDamageShape } from '../../../shared/types/creatureAbilities';
import { getActiveEffects } from './effectTicks';
import type { CreepEntity } from './types';

// The creature abilities that sit on the damage path: incoming damage
// multipliers, the shield pool and the second life. `applyDamageToCreep`
// calls these; a creep without `abilities` passes through untouched.

/**
 * Scale on damage that reached the creep as `shape` (absent: unknown shape,
 * no shape multiplier) of `damageType`: the shape's multiplier times the
 * `percent` one for percent damage.
 */
export function getIncomingDamageMultiplier(
  creep: CreepEntity,
  damageType: DamageType,
  shape: CreatureDamageShape | undefined,
): number {
  const multipliers = creep.abilities?.incomingDamageMultipliers;
  if (multipliers === undefined) {
    return CREATURE_ABILITY_BALANCE.neutralMultiplier;
  }
  const shapeMultiplier =
    shape === undefined
      ? CREATURE_ABILITY_BALANCE.neutralMultiplier
      : (multipliers[shape] ?? CREATURE_ABILITY_BALANCE.neutralMultiplier);
  const percentMultiplier =
    damageType === DamageType.PERCENT
      ? (multipliers.percent ?? CREATURE_ABILITY_BALANCE.neutralMultiplier)
      : CREATURE_ABILITY_BALANCE.neutralMultiplier;
  return shapeMultiplier * percentMultiplier;
}

/** Damage the creep's shield takes off `damage`; 0 without a shield ability. */
export function getShieldAbsorbedDamage(creep: CreepEntity, damage: number): number {
  if (creep.abilities?.shieldHp === undefined) {
    return 0;
  }
  return Math.min(creep.shieldHp ?? 0, damage);
}

/**
 * The creep standing up again for its `secondLife`, or undefined when it has
 * none or already used it. A second life immune to chill drops a running one.
 */
export function reviveForSecondLife(creep: CreepEntity): CreepEntity | undefined {
  const secondLife = creep.abilities?.secondLife;
  if (secondLife === undefined || creep.isOnSecondLife === true) {
    return undefined;
  }
  const maxHp = creep.maxHp ?? creep.hp;
  const revived: CreepEntity = {
    ...creep,
    hp: maxHp * secondLife.hpShare,
    lifeState: 'alive',
    status: 'alive',
    isOnSecondLife: true,
  };
  if (secondLife.immuneToChill === true && creep.activeEffects !== undefined) {
    revived.activeEffects = getActiveEffects(creep).filter(
      (effect) => effect.id !== EffectId.CHILL,
    );
  }
  return revived;
}
