import undeadContent from '../../../../content/units/undead.json';
import { parseUnitContentFile } from '../content/loadUnitContent';
import type { UnitTier, UnitConfig } from '../types';

/**
 * Undead roster. Stats are authored in `src/content/units/undead.json`, not
 * derived from the tier, so each creature can carry its own identity: ghouls
 * are fast and frail, abominations slow and armored.
 */
export const undeadUnits: UnitConfig[] = parseUnitContentFile({
  file: 'content/units/undead.json',
  data: undeadContent,
});

export function getUnitsByTier(tier: UnitTier): UnitConfig[] {
  return undeadUnits.filter((unit) => unit.tier === tier);
}
