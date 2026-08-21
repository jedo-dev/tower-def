export {
  getTowerArchetype,
  getTowerAttackKind,
  getTowerOnHitEffects,
  TOWER_ARCHETYPE_DEFINITIONS,
  TOWER_COMBAT_STATS_BY_TYPE,
} from './model/types';
export type { TowerArchetypeDefinition } from './model/content/loadTowerContent';
export {
  buildableTowers,
  getBuildableTowersByFaction,
  resolveBuildableTowerById,
  tryResolveBuildableTowerById,
} from './model/config/buildableTowers';
export {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './model/cooldown';
export { getCreepsInTowerRange, selectTowerTarget } from './model/targeting';
export {
  applyAuraBonusToStats,
  recalculateTowerAuras,
  resolveTowerAuraBonus,
} from './model/auras';
export type { TowerAuraBonus } from './model/auras';
export {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForLevel,
  getTowerStatsForTowerLevel,
  resolveTowerUpgradeConfig,
  getUpgradeCost,
  isMaxLevel,
  createTowerLevel,
  INITIAL_TOWER_LEVEL,
} from './model/upgrade';
export type { UpgradeCheckResult } from './model/upgrade';
export type {
  BuildableTowerConfig,
  BuildableTowerId,
  TowerOnHitEffect,
  BuildableTowerType,
  TowerCombatStats,
  TowerEntity,
  TowerId,
  TowerType,
  TowerLevelStats,
  TowerUpgradeLevel,
  TowerTypeUpgradeConfig,
} from './model/types';
export {
  BUILDABLE_TOWER_IDS,
  TowerTypeConfig,
  TOWER_UPGRADE_CONFIG,
  TowerUpgradeBalance,
  TOWER_BASE_LEVEL,
} from './model/types';
export type { TowerCombatRuntime } from './model/cooldown';
