import type { GridPosition } from '../../../shared/types/pathfinding';
import { TowerCombatConfig } from '../../../shared/constants/tower';
import type { BuilderFaction } from '../../builder-faction/model/types';

export type TowerId = string;

export type TowerType = 'archer' | 'splash';

export const TowerTypeConfig = {
  ARCHER: 'archer',
} as const;

export type BuildableTowerType = (typeof TowerTypeConfig)[keyof typeof TowerTypeConfig];

export type BuildableTowerId =
  | 'undead_bone_archer_tower'
  | 'orc_spear_watchtower'
  | 'human_guard_archer_tower'
  | 'elf_moon_archer_tower';

export type BuildableTowerConfig = {
  id: BuildableTowerId;
  name: string;
  faction: BuilderFaction;
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
