export { TOWER_COMBAT_STATS_BY_TYPE } from './model/types';
export {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './model/cooldown';
export { getCreepsInTowerRange, selectTowerTarget } from './model/targeting';
export type { TowerCombatStats, TowerEntity, TowerId, TowerType } from './model/types';
export type { TowerCombatRuntime } from './model/cooldown';
