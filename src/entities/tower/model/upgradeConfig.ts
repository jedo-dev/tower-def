import type { TowerOnHitEffect } from './types';
import type { TowerAuraDefinition, TowerChainDefinition } from './content/loadTowerContent';

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
  /**
   * Chain shape of a talent grade. Combat still reads the archetype's shape;
   * the combat mechanics task wires the per-grade one.
   */
  chain?: TowerChainDefinition;
  /**
   * Named numeric modifiers a talent grade declares (keys from
   * `TOWER_GRADE_ABILITY_KEYS`), read by the combat mechanics that own them.
   */
  abilities?: Readonly<Record<string, number>>;
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
  /** Top of the base curve; a chosen talent branch extends it to grade 7. */
  MAX_LEVEL = 3,
}
