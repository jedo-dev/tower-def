import type { TowerOnHitEffect } from '../../entities/tower/model/types';
import type { TowerAuraDefinition } from '../../entities/tower/model/content/loadTowerContent';

/**
 * Upgrade curves live in `src/content/towers/archetypes.json`, one per
 * archetype, so a level can buy a deeper slow or a wider aura instead of only
 * bigger numbers. These types describe what the content resolves to.
 */

export type TowerLevelStats = {
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  /** Effects applied on hit at this level; absent means the archetype default. */
  onHitEffects?: TowerOnHitEffect[];
  /** Aura this level projects; only support archetypes declare one. */
  aura?: TowerAuraDefinition;
};

export type TowerUpgradeLevel = {
  level: number;
  upgradeCostGold: number;
  stats: TowerLevelStats;
};

export type TowerTypeUpgradeConfig = {
  maxLevel: number;
  levels: TowerUpgradeLevel[];
};

export enum TowerUpgradeBalance {
  MAX_LEVEL = 3,
}
