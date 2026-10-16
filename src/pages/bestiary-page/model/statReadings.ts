import { PERCENT_DAMAGE } from '../../../shared/constants/damage';
import { DamageType } from '../../../shared/types/content-ids';
import type { StatDeltaViewModel, StatKey, StatReadingViewModel } from './types';

/**
 * Compact stat readings for the codex chips, level columns and grade cards:
 * a pictogram key, a short value and, against an earlier level or grade, a
 * signed delta toned by whether it helps the unit.
 */

const MILLISECONDS_PER_SECOND = 1000;
const NO_VALUE = '—';
const MINUS_SIGN = '−';

/** Damage pictogram for a tower's damage type. */
export const DAMAGE_STAT_KEYS: Record<DamageType, StatKey> = {
  [DamageType.PHYSICAL]: 'physical',
  [DamageType.MAGICAL]: 'magical',
  [DamageType.PERCENT]: 'percent',
};

const DAMAGE_STAT_LABELS: Record<DamageType, string> = {
  [DamageType.PHYSICAL]: 'Physical damage',
  [DamageType.MAGICAL]: 'Magical damage',
  [DamageType.PERCENT]: 'Damage, share of max HP',
};

function trimNumber(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

/**
 * A signed change from `previous` to `current`. Raising the stat is good
 * unless `lowerIsBetter` (reload); an unchanged stat reads "±0".
 */
export function formatStatDelta(
  current: number,
  previous: number,
  digits: number,
  options: { lowerIsBetter?: boolean; suffix?: string } = {},
): StatDeltaViewModel {
  const difference = Number((current - previous).toFixed(digits));
  if (difference === 0) {
    return { text: '±0', tone: 'neutral' };
  }
  const improves = options.lowerIsBetter ? difference < 0 : difference > 0;
  const sign = difference > 0 ? '+' : MINUS_SIGN;
  return {
    text: `${sign}${trimNumber(Math.abs(difference), digits)}${options.suffix ?? ''}`,
    tone: improves ? 'good' : 'bad',
  };
}

/** Percent damage is authored in per mille of max health; chips show the bare share. */
function percentOfMaxHealth(perMille: number): number {
  return (perMille / PERCENT_DAMAGE.healthShareDivisor) * 100;
}

/** One tower's attack numbers, as authored at a level or talent grade. */
export type TowerAttackNumbers = {
  damage: number;
  range: number;
  attackCooldownMs: number;
};

function damageReading(
  current: TowerAttackNumbers,
  previous: TowerAttackNumbers | null,
  damageType: DamageType,
): StatReadingViewModel {
  const key = DAMAGE_STAT_KEYS[damageType];
  const label = DAMAGE_STAT_LABELS[damageType];
  if (current.damage <= 0) {
    return { key, label, value: NO_VALUE, delta: null };
  }
  const isPercent = damageType === DamageType.PERCENT;
  const value = isPercent ? percentOfMaxHealth(current.damage) : current.damage;
  const suffix = isPercent ? '%' : '';
  const digits = isPercent ? 1 : 0;
  const delta =
    previous === null || previous.damage <= 0
      ? null
      : formatStatDelta(
          value,
          isPercent ? percentOfMaxHealth(previous.damage) : previous.damage,
          digits,
          { suffix },
        );
  return { key, label, value: `${trimNumber(value, digits)}${suffix}`, delta };
}

/**
 * Damage, range and reload of a tower level or grade, each with a delta
 * against `previous` when given. A support level without an attack shows
 * dashes: its numbers are placeholders, not stats.
 */
export function towerAttackReadings(
  current: TowerAttackNumbers,
  previous: TowerAttackNumbers | null,
  damageType: DamageType,
): StatReadingViewModel[] {
  const attacks = current.damage > 0;
  const compares = previous !== null && previous.damage > 0 && attacks;
  const reloadSeconds = current.attackCooldownMs / MILLISECONDS_PER_SECOND;

  return [
    damageReading(current, previous, damageType),
    {
      key: 'range',
      label: 'Range, cells',
      value: attacks ? trimNumber(current.range, 1) : NO_VALUE,
      delta: compares ? formatStatDelta(current.range, previous.range, 1) : null,
    },
    {
      key: 'reload',
      label: 'Reload, seconds',
      value: attacks ? `${trimNumber(reloadSeconds, 2)}s` : NO_VALUE,
      delta: compares
        ? formatStatDelta(reloadSeconds, previous.attackCooldownMs / MILLISECONDS_PER_SECOND, 2, {
            lowerIsBetter: true,
          })
        : null,
    },
  ];
}

export function goldReading(label: string, gold: number): StatReadingViewModel {
  return { key: 'gold', label, value: String(gold), delta: null };
}

/** A creature's body at base or at a talent grade. */
export type CreatureBodyNumbers = {
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
};

/** HP, speed and both armors, each with a delta against `previous` when given. */
export function creatureBodyReadings(
  current: CreatureBodyNumbers,
  previous: CreatureBodyNumbers | null,
): StatReadingViewModel[] {
  const delta = (pick: (body: CreatureBodyNumbers) => number, digits: number) =>
    previous === null ? null : formatStatDelta(pick(current), pick(previous), digits);

  return [
    {
      key: 'health',
      label: 'HP (wave 1)',
      value: String(current.health),
      delta: delta((body) => body.health, 0),
    },
    {
      key: 'speed',
      label: 'Speed',
      value: trimNumber(current.speed, 2),
      delta: delta((body) => body.speed, 2),
    },
    {
      key: 'physicalArmor',
      label: 'Physical armor',
      value: String(current.physicalArmor),
      delta: delta((body) => body.physicalArmor, 0),
    },
    {
      key: 'magicalArmor',
      label: 'Magical armor',
      value: String(current.magicalArmor),
      delta: delta((body) => body.magicalArmor, 0),
    },
  ];
}
