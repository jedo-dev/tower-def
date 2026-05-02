import type { GridPosition } from '../../../shared/types/pathfinding';
import { TowerCombatConfig } from '../../../shared/constants/tower';

export type TowerId = string;

export type TowerType = 'archer' | 'splash';

export type TowerCombatStats = {
  range: number;
  damage: number;
  attackCooldownMs: number;
};

export const TOWER_COMBAT_STATS_BY_TYPE: Record<TowerType, TowerCombatStats> = {
  archer: {
    range: TowerCombatConfig.ARCHER_RANGE_CELLS,
    damage: TowerCombatConfig.ARCHER_DAMAGE,
    attackCooldownMs: TowerCombatConfig.ARCHER_ATTACK_COOLDOWN_MS,
  },
  splash: {
    range: TowerCombatConfig.SPLASH_RANGE_CELLS,
    damage: TowerCombatConfig.SPLASH_DAMAGE,
    attackCooldownMs: TowerCombatConfig.SPLASH_ATTACK_COOLDOWN_MS,
  },
};

export type TowerEntity = {
  id: TowerId;
  position: GridPosition;
  cost: number;
  type: TowerType;
  combatStats: TowerCombatStats;
};
