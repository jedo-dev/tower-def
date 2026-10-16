import { DamageType } from '../../../../shared/types/content-ids';
import { calculateDamageAgainst } from '../../../creep/model/damage';

/**
 * How much of a creature one point of raw tower damage removes, per damage
 * type, in hit points: 1 is face value, below 1 the matching armor shrugs part
 * of it off, above 1 negative armor (or percent damage on a big creature)
 * amplifies it. Every damage estimate of the computer opponent multiplies a
 * tower's raw damage by the entry of its damage type, so a ledger value is in
 * plain hit points of the wave it is measured against.
 */
export type DamageTypeEfficiency = Readonly<Record<DamageType, number>>;

/** No wave to read: every damage type at face value. */
export const NEUTRAL_DAMAGE_EFFICIENCY: DamageTypeEfficiency = Object.freeze({
  [DamageType.PHYSICAL]: 1,
  [DamageType.MAGICAL]: 1,
  [DamageType.PERCENT]: 1,
});

/**
 * A group of creeps as damage sees it: their health, and the raw damage of
 * each type it takes to kill all of them (`health / efficiency` per creep).
 * Sums, so groups add up and scale linearly.
 */
export type ArmorTally = {
  health: number;
  killDamage: Readonly<Record<DamageType, number>>;
};

export const EMPTY_ARMOR_TALLY: ArmorTally = Object.freeze({
  health: 0,
  killDamage: Object.freeze({
    [DamageType.PHYSICAL]: 0,
    [DamageType.MAGICAL]: 0,
    [DamageType.PERCENT]: 0,
  }),
});

/** A creature as the estimate sees it: its (wave-scaled) health and both armors. */
export type ArmoredHealth = {
  health: number;
  physicalArmor: number;
  magicalArmor: number;
};

/**
 * Raw damage of `damageType` it takes to kill `creature`, through the combat
 * rule (`calculateDamageAgainst`): health over the share of a raw point that
 * lands. Percent damage takes the same raw damage from any creature, which is
 * exactly why it is worth more the bigger the creature is.
 */
export function computeKillDamage(creature: ArmoredHealth, damageType: DamageType): number {
  if (creature.health <= 0) {
    return 0;
  }
  const landed = calculateDamageAgainst(1, damageType, {
    physicalArmor: creature.physicalArmor,
    magicalArmor: creature.magicalArmor,
    maxHp: creature.health,
  });
  return landed > 0 ? creature.health / landed : 0;
}

export function tallyCreature(creature: ArmoredHealth): ArmorTally {
  return {
    health: Math.max(0, creature.health),
    killDamage: {
      [DamageType.PHYSICAL]: computeKillDamage(creature, DamageType.PHYSICAL),
      [DamageType.MAGICAL]: computeKillDamage(creature, DamageType.MAGICAL),
      [DamageType.PERCENT]: computeKillDamage(creature, DamageType.PERCENT),
    },
  };
}

export function addArmorTallies(left: ArmorTally, right: ArmorTally): ArmorTally {
  return {
    health: left.health + right.health,
    killDamage: {
      [DamageType.PHYSICAL]:
        left.killDamage[DamageType.PHYSICAL] + right.killDamage[DamageType.PHYSICAL],
      [DamageType.MAGICAL]:
        left.killDamage[DamageType.MAGICAL] + right.killDamage[DamageType.MAGICAL],
      [DamageType.PERCENT]:
        left.killDamage[DamageType.PERCENT] + right.killDamage[DamageType.PERCENT],
    },
  };
}

export function scaleArmorTally(tally: ArmorTally, factor: number): ArmorTally {
  return {
    health: tally.health * factor,
    killDamage: {
      [DamageType.PHYSICAL]: tally.killDamage[DamageType.PHYSICAL] * factor,
      [DamageType.MAGICAL]: tally.killDamage[DamageType.MAGICAL] * factor,
      [DamageType.PERCENT]: tally.killDamage[DamageType.PERCENT] * factor,
    },
  };
}

function efficiencyOf(tally: ArmorTally, damageType: DamageType): number {
  const killDamage = tally.killDamage[damageType];
  return tally.health > 0 && killDamage > 0 ? tally.health / killDamage : 1;
}

/**
 * Hit points one raw damage point of each type removes from the group, on
 * average over its health: `health / killDamage`. A tower of type `t` with
 * raw damage `D` kills `D / killDamage[t]` of the group, which in hit points
 * is `D * efficiency[t]`. Neutral for an empty group.
 */
export function toDamageTypeEfficiency(tally: ArmorTally): DamageTypeEfficiency {
  return {
    [DamageType.PHYSICAL]: efficiencyOf(tally, DamageType.PHYSICAL),
    [DamageType.MAGICAL]: efficiencyOf(tally, DamageType.MAGICAL),
    [DamageType.PERCENT]: efficiencyOf(tally, DamageType.PERCENT),
  };
}
