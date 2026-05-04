export { TOWER_COMBAT_STATS_BY_TYPE } from './model/types';
export { buildableTowers } from './model/config/buildableTowers';
export {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './model/cooldown';
export { getCreepsInTowerRange, selectTowerTarget } from './model/targeting';
export type {
  BuildableTowerConfig,
  BuildableTowerId,
  BuildableTowerType,
  TowerCombatStats,
  TowerEntity,
  TowerId,
  TowerType,
} from './model/types';
export { TowerTypeConfig } from './model/types';
export type { TowerCombatRuntime } from './model/cooldown';
