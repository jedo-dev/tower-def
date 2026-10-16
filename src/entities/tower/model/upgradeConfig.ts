import type { TowerOnHitEffect } from './types';
import type { TowerAuraDefinition, TowerChainDefinition } from './content/loadTowerContent';
import type { TowerAbilities } from './abilities';
import type { TowerTargetScope } from '../../../shared/types/content-ids';

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
  /** Chain shape of this level or talent grade; absent means the archetype's. */
  chain?: TowerChainDefinition;
  /**
   * Optional abilities of this level, authored under `abilities` on any
   * `levels[]` entry (and reusable by talent grade objects); see
   * `TowerAbilities` and docs/08 "Tower abilities".
   */
  abilities?: TowerAbilities;
  /**
   * Target scope of this level or talent grade (e.g. a mortar grade that
   * reaches fliers); absent means the tower's own scope. See
   * `resolveTowerTargetScope`.
   */
  allowedTargets?: TowerTargetScope;
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
