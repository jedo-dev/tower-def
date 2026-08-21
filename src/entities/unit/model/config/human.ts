import { selectFactionRoster } from '../registry';
import { Faction, type UnitConfig, type UnitTier } from '../types';

/**
 * Human roster, authored in `src/content/units/human.json`: the armored race,
 * trading speed for the best damage reduction.
 */
export const humanUnits: UnitConfig[] = selectFactionRoster(Faction.HUMAN);

export function getHumanUnitsByTier(tier: UnitTier): UnitConfig[] {
  return humanUnits.filter((unit) => unit.tier === tier);
}
