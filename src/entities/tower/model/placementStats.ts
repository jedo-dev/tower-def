import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { BuildableTowerConfig, TowerCombatStats } from './types';
import { TOWER_COMBAT_STATS_BY_TYPE } from './types';

/**
 * Stats a freshly placed tower fights with: its authored numbers when content
 * declares them (a race tower may price and tune its archetype differently),
 * the archetype defaults otherwise. The player's build runtime and the
 * computer opponent place towers through this one resolver, so both sides'
 * towers of one race fight with the same numbers.
 */
export function resolveTowerPlacementStats(
  towerType: TowerTypeId,
  authoredTower: BuildableTowerConfig | null,
): TowerCombatStats {
  const archetypeStats = TOWER_COMBAT_STATS_BY_TYPE[towerType];

  if (!authoredTower) {
    return { ...archetypeStats };
  }

  const authoredLevelOne = authoredTower.levels?.[0]?.stats;

  return {
    ...archetypeStats,
    ...(authoredLevelOne ?? {}),
    damage: authoredLevelOne?.damage ?? authoredTower.damage,
    range: authoredLevelOne?.range ?? authoredTower.range,
    attackCooldownMs: authoredLevelOne?.attackCooldownMs ?? authoredTower.attackCooldownMs,
    ...(authoredTower.splashRadius === undefined
      ? {}
      : { splashRadius: authoredTower.splashRadius }),
    ...(authoredTower.onHitEffects.length === 0
      ? {}
      : { onHitEffects: authoredTower.onHitEffects }),
  };
}
