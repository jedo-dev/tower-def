import { loadTowerContent } from '../content/loadTowerContent';
import { TOWER_CONTENT_SOURCES } from '../content/towerContentSources';
import type { BuildableTowerConfig, BuildableTowerId } from '../types';

/**
 * Buildable towers of every race, authored in `src/content/towers/<race>.json`
 * and validated once at module init.
 */
export const buildableTowers: BuildableTowerConfig[] = loadTowerContent(TOWER_CONTENT_SOURCES);

const TOWER_BY_ID = new Map<BuildableTowerId, BuildableTowerConfig>(
  buildableTowers.map((tower) => [tower.id, tower]),
);

export function tryResolveBuildableTowerById(
  towerId: BuildableTowerId,
): BuildableTowerConfig | undefined {
  return TOWER_BY_ID.get(towerId);
}

export function resolveBuildableTowerById(towerId: BuildableTowerId): BuildableTowerConfig {
  const tower = TOWER_BY_ID.get(towerId);

  if (!tower) {
    throw new Error(`Missing tower config for id: ${towerId}`);
  }

  return tower;
}

export function getBuildableTowersByFaction(
  faction: BuildableTowerConfig['faction'],
): BuildableTowerConfig[] {
  return buildableTowers.filter((tower) => tower.faction === faction);
}
