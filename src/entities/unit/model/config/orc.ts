import orcContent from '../../../../content/units/orc.json';
import { parseUnitContentFile } from '../content/loadUnitContent';
import type { UnitTier, UnitConfig } from '../types';

/**
 * Orc roster. Authored in `src/content/units/orc.json`: heavy, slow brutes
 * with the wolf rider as the deliberate fast outlier.
 */
export const orcUnits: UnitConfig[] = parseUnitContentFile({
  file: 'content/units/orc.json',
  data: orcContent,
});

export function getOrcUnitsByTier(tier: UnitTier): UnitConfig[] {
  return orcUnits.filter((unit) => unit.tier === tier);
}
