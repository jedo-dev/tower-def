import type { GridPosition } from '../../../shared/types/pathfinding';
import { TowerCombatConfig } from '../../../shared/constants/tower';
import type { RaceId } from '../../../shared/types/content-ids';
import { TowerTypeId } from '../../../shared/types/content-ids';

export type TowerId = string;

export type TowerType = TowerTypeId;

export const TowerTypeConfig = TowerTypeId;

export type BuildableTowerType = TowerTypeId;

export type BuildableTowerId =
  | 'undead_bone_archer_tower'
  | 'undead_plague_tower'
  | 'orc_spear_watchtower'
  | 'human_guard_archer_tower'
  | 'elf_moon_archer_tower';

export type BuildableTowerConfig = {
  id: BuildableTowerId;
  name: string;
  faction: RaceId;
  towerType: BuildableTowerType;
  costGold: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  spriteKey: string;
  description: string;
};

export type TowerCombatStats = {
  range: number;
  damage: number;
  attackCooldownMs: number;
  splashRadius?: number;
};

export const TOWER_COMBAT_STATS_BY_TYPE: Record<TowerTypeId, TowerCombatStats> = {
  archer: {
    range: TowerCombatConfig.ARCHER_RANGE_CELLS,
    damage: TowerCombatConfig.ARCHER_DAMAGE,
    attackCooldownMs: TowerCombatConfig.ARCHER_ATTACK_COOLDOWN_MS,
  },
  splash: {
    range: TowerCombatConfig.SPLASH_RANGE_CELLS,
    damage: TowerCombatConfig.SPLASH_DAMAGE,
    attackCooldownMs: TowerCombatConfig.SPLASH_ATTACK_COOLDOWN_MS,
    splashRadius: TowerCombatConfig.SPLASH_RADIUS_CELLS,
  },
};

export type TowerEntity = {
  id: TowerId;
  position: GridPosition;
  cost: number;
  type: TowerType;
  combatStats: TowerCombatStats;
};
