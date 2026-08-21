import { selectFactionRoster } from '../registry';
import { Faction, type UnitConfig, type UnitTier } from '../types';

/**
 * Elf roster, authored in `src/content/units/elf.json`: the fastest and
 * frailest race, with the chimera as its one heavy straggler.
 */
export const elfUnits: UnitConfig[] = selectFactionRoster(Faction.ELF);

export function getElfUnitsByTier(tier: UnitTier): UnitConfig[] {
  return elfUnits.filter((unit) => unit.tier === tier);
}
