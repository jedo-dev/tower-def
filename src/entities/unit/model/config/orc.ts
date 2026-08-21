import { selectFactionRoster } from '../registry';
import { Faction, type UnitConfig, type UnitTier } from '../types';

/**
 * Orc roster, authored in `src/content/units/orc.json`: heavy, slow brutes
 * with the wolf rider as the deliberate fast outlier.
 */
export const orcUnits: UnitConfig[] = selectFactionRoster(Faction.ORC);

export function getOrcUnitsByTier(tier: UnitTier): UnitConfig[] {
  return orcUnits.filter((unit) => unit.tier === tier);
}
