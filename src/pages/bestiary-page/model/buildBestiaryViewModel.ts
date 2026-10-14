import { getAllRaceRegistries, type RaceRegistryEntry } from '../../../entities/race-registry';
import { getUnitsByFaction, type UnitConfig } from '../../../entities/unit';
import { getBuildableTowersByFaction, type BuildableTowerConfig } from '../../../entities/tower';
import { FACTION_THEME_COLOR_VARS, type FactionThemeName } from '../../../shared/constants/theme';
import type { RaceId } from '../../../shared/types/content-ids';
import { mapUnitsToCreepCards } from './creepCards';
import { mapTowersToTowerCards } from './towerCards';
import type { BestiaryViewModel, RaceBestiaryViewModel } from './types';

/**
 * Where the bestiary reads its content from. Defaults to the validated
 * registries; tests inject fixtures to cover shapes the shipped content does
 * not have yet (lore, extra tiers).
 */
export type BestiaryContentSources = {
  races: readonly RaceRegistryEntry[];
  unitsOf: (raceId: RaceId) => readonly UnitConfig[];
  towersOf: (raceId: RaceId) => readonly BuildableTowerConfig[];
};

const DEFAULT_SOURCES: BestiaryContentSources = {
  races: getAllRaceRegistries(),
  unitsOf: getUnitsByFaction,
  towersOf: getBuildableTowersByFaction,
};

export function toFactionThemeName(raceId: RaceId): FactionThemeName {
  return raceId.toLowerCase() as FactionThemeName;
}

function mapRace(race: RaceRegistryEntry, sources: BestiaryContentSources): RaceBestiaryViewModel {
  const faction = toFactionThemeName(race.raceId);

  return {
    raceId: race.raceId,
    name: race.name,
    description: race.description,
    faction,
    themeColor: FACTION_THEME_COLOR_VARS[faction],
    creeps: mapUnitsToCreepCards(sources.unitsOf(race.raceId)),
    towers: mapTowersToTowerCards(sources.towersOf(race.raceId)),
  };
}

/** Everything the bestiary screen shows, in registry order. Pure: no React, no Phaser. */
export function buildBestiaryViewModel(
  sources: BestiaryContentSources = DEFAULT_SOURCES,
): BestiaryViewModel {
  return { races: sources.races.map((race) => mapRace(race, sources)) };
}
