import { getArmorDamageMultiplier } from '../../../entities/creep';
import { PERCENT_DAMAGE } from '../../../shared/constants/damage';
import { DamageType } from '../../../shared/types/content-ids';
import type { DamageTypeViewModel } from './types';

/**
 * Display text for armor and damage types on the bestiary cards. Numbers come
 * from the combat rules (`getArmorDamageMultiplier`, `PERCENT_DAMAGE`), so a
 * tooltip never states a share the game does not apply.
 */

export type CreepArmorAxis = 'physical' | 'magical';

/** Short stat labels; the tooltip spells the armor out. */
export const ARMOR_SHORT_LABELS: Record<CreepArmorAxis, string> = {
  physical: 'Phys. armor',
  magical: 'Mag. armor',
};

const ARMOR_FULL_NAMES: Record<CreepArmorAxis, string> = {
  physical: 'Physical armor',
  magical: 'Magical armor',
};

const ARMOR_HIT_SOURCES: Record<CreepArmorAxis, string> = {
  physical: 'physical hits',
  magical: 'magical hits and damage over time',
};

const DAMAGE_TYPE_DISPLAY: Record<DamageType, Omit<DamageTypeViewModel, 'type'>> = {
  [DamageType.PHYSICAL]: {
    glyph: '⚔',
    label: 'Physical',
    hint: 'Physical damage: reduced by physical armor.',
  },
  [DamageType.MAGICAL]: {
    glyph: '✦',
    label: 'Magical',
    hint: 'Magical damage: reduced by magical armor.',
  },
  [DamageType.PERCENT]: {
    glyph: '%',
    label: 'Percent',
    hint: 'Percent damage: a share of maximum health per hit, ignores armor.',
  },
};

function formatShare(multiplier: number): string {
  return `${Math.round(multiplier * 100)}%`;
}

/** Tooltip for one armor: what it is and how hard the matching hits land. */
export function describeArmor(axis: CreepArmorAxis, armor: number): string {
  const lands = formatShare(getArmorDamageMultiplier(armor));
  return `${ARMOR_FULL_NAMES[axis]} ${armor}: ${ARMOR_HIT_SOURCES[axis]} land for ${lands}.`;
}

export function describeDamageType(damageType: DamageType): DamageTypeViewModel {
  return { type: damageType, ...DAMAGE_TYPE_DISPLAY[damageType] };
}

/**
 * Percent damage is authored in per mille of maximum health: 6 reads as
 * "0.6% max HP".
 */
export function formatPercentOfMaxHealth(perMille: number): string {
  const percent = (perMille / PERCENT_DAMAGE.healthShareDivisor) * 100;
  return `${Number(percent.toFixed(1))}% max HP`;
}
