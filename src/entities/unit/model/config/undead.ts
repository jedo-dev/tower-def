import { selectFactionRoster } from '../registry';
import { Faction, type UnitConfig, type UnitTier } from '../types';

/**
 * Undead roster, authored in `src/content/units/undead.json`: ghouls fast and
 * frail, crypt fiends armored, abominations slow and heavy.
 */
export const undeadUnits: UnitConfig[] = selectFactionRoster(Faction.UNDEAD);

export function getUnitsByTier(tier: UnitTier): UnitConfig[] {
  return undeadUnits.filter((unit) => unit.tier === tier);
}
