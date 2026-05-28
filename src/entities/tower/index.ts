export { TOWER_COMBAT_STATS_BY_TYPE } from './model/types';
export { buildableTowers } from './model/config/buildableTowers';
export {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './model/cooldown';
export { getCreepsInTowerRange, selectTowerTarget } from './model/targeting';
export {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForLevel,
  getUpgradeCost,
  isMaxLevel,
  createTowerLevel,
  INITIAL_TOWER_LEVEL,
} from './model/upgrade';
export type { UpgradeCheckResult } from './model/upgrade';
export type {
  BuildableTowerConfig,
  BuildableTowerId,
  BuildableTowerType,
  TowerCombatStats,
  TowerEntity,
  TowerId,
  TowerType,
  TowerLevelStats,
  TowerUpgradeLevel,
  TowerTypeUpgradeConfig,
} from './model/types';
export { TowerTypeConfig, TOWER_UPGRADE_CONFIG, TowerUpgradeBalance, TOWER_BASE_LEVEL } from './model/types';
export type { TowerCombatRuntime } from './model/cooldown';
