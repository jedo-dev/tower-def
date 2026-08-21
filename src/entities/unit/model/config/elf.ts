import elfContent from '../../../../content/units/elf.json';
import { parseUnitContentFile } from '../content/loadUnitContent';
import type { UnitTier, UnitConfig } from '../types';

/**
 * Elf roster. Authored in `src/content/units/elf.json`: the fastest and
 * frailest race, cheap to kill and punishing to ignore.
 */
export const elfUnits: UnitConfig[] = parseUnitContentFile({
  file: 'content/units/elf.json',
  data: elfContent,
});

export function getElfUnitsByTier(tier: UnitTier): UnitConfig[] {
  return elfUnits.filter((unit) => unit.tier === tier);
}
