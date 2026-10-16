export {
  addArmorTallies,
  computeKillDamage,
  EMPTY_ARMOR_TALLY,
  NEUTRAL_DAMAGE_EFFICIENCY,
  scaleArmorTally,
  tallyCreature,
  toDamageTypeEfficiency,
} from './armorProfile';
export {
  computeMixedEffectiveHealth,
  computeRelativeDamageEfficiency,
  EVEN_DAMAGE_MIX,
  normalizeDamageMix,
} from './damageMix';

export type { ArmoredHealth, ArmorTally, DamageTypeEfficiency } from './armorProfile';
export type { DamageTypeMix } from './damageMix';
