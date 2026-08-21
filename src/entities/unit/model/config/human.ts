import humanContent from '../../../../content/units/human.json';
import { parseUnitContentFile } from '../content/loadUnitContent';
import type { UnitTier, UnitConfig } from '../types';

/**
 * Human roster. Authored in `src/content/units/human.json`: the armored race,
 * trading raw health and speed for the best damage reduction.
 */
export const humanUnits: UnitConfig[] = parseUnitContentFile({
  file: 'content/units/human.json',
  data: humanContent,
});

export function getHumanUnitsByTier(tier: UnitTier): UnitConfig[] {
  return humanUnits.filter((unit) => unit.tier === tier);
}
