import type { TowerOnHitEffect } from '../../entities/tower/model/types';
import { EffectId } from '../types/content-ids';

export enum TowerCombatConfig {
  ARCHER_RANGE_CELLS = 3,
  ARCHER_DAMAGE = 20,
  ARCHER_ATTACK_COOLDOWN_MS = 800,
  SPLASH_RANGE_CELLS = 2.5,
  SPLASH_DAMAGE = 18,
  SPLASH_ATTACK_COOLDOWN_MS = 1200,
  SPLASH_RADIUS_CELLS = 1.5,
}

export type TowerLevelStats = {
  damage: number;
  range: number;
  attackCooldownMs: number;
  splashRadius?: number;
  /** Effects applied on hit at this level; absent means the archetype default. */
  onHitEffects?: TowerOnHitEffect[];
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
  LEVEL_2_COST_GOLD = 40,
  LEVEL_3_COST_GOLD = 80,
  DAMAGE_INCREASE_PER_LEVEL = 10,
  RANGE_INCREASE_PER_LEVEL = 0.2,
  COOLDOWN_REDUCTION_PER_LEVEL = 50,
}

export enum FrostTowerBalance {
  DAMAGE = 13,
  RANGE_CELLS = 3,
  ATTACK_COOLDOWN_MS = 900,
  LEVEL_2_COST_GOLD = 45,
  LEVEL_3_COST_GOLD = 90,
  CHILL_DURATION_MS = 2000,
}

/** Frost upgrades buy control first: the slow deepens faster than the damage. */
const FROST_CHILL_MAGNITUDE_BY_LEVEL = [0.35, 0.45, 0.55] as const;

function createFrostLevel(level: 1 | 2 | 3, upgradeCostGold: number): TowerUpgradeLevel {
  const levelIndex = level - 1;
  return {
    level,
    upgradeCostGold,
    stats: {
      damage: FrostTowerBalance.DAMAGE + levelIndex * 4,
      range: FrostTowerBalance.RANGE_CELLS + levelIndex * TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL,
      attackCooldownMs:
        FrostTowerBalance.ATTACK_COOLDOWN_MS - levelIndex * TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL,
      onHitEffects: [
        {
          effectId: EffectId.CHILL,
          magnitude: FROST_CHILL_MAGNITUDE_BY_LEVEL[levelIndex],
          durationMs: FrostTowerBalance.CHILL_DURATION_MS,
        },
      ],
    },
  };
}

export enum PoisonTowerBalance {
  DAMAGE = 8,
  RANGE_CELLS = 3,
  ATTACK_COOLDOWN_MS = 1000,
  LEVEL_2_COST_GOLD = 50,
  LEVEL_3_COST_GOLD = 95,
  POISON_DURATION_MS = 4000,
}

/** Poison upgrades buy pressure over time: deeper stacks and harder ticks. */
const POISON_TICK_DAMAGE_BY_LEVEL = [6, 8, 11] as const;
const POISON_MAX_STACKS_BY_LEVEL = [3, 4, 5] as const;

function createPoisonLevel(level: 1 | 2 | 3, upgradeCostGold: number): TowerUpgradeLevel {
  const levelIndex = level - 1;
  return {
    level,
    upgradeCostGold,
    stats: {
      damage: PoisonTowerBalance.DAMAGE + levelIndex * 2,
      range: PoisonTowerBalance.RANGE_CELLS + levelIndex * TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL,
      attackCooldownMs:
        PoisonTowerBalance.ATTACK_COOLDOWN_MS - levelIndex * TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL,
      onHitEffects: [
        {
          effectId: EffectId.POISON,
          magnitude: POISON_TICK_DAMAGE_BY_LEVEL[levelIndex],
          durationMs: PoisonTowerBalance.POISON_DURATION_MS,
          maxStacks: POISON_MAX_STACKS_BY_LEVEL[levelIndex],
        },
      ],
    },
  };
}

export const TOWER_UPGRADE_CONFIG: Record<string, TowerTypeUpgradeConfig> = {
  poison: {
    maxLevel: TowerUpgradeBalance.MAX_LEVEL,
    levels: [
      createPoisonLevel(1, 0),
      createPoisonLevel(2, PoisonTowerBalance.LEVEL_2_COST_GOLD),
      createPoisonLevel(3, PoisonTowerBalance.LEVEL_3_COST_GOLD),
    ],
  },
  frost: {
    maxLevel: TowerUpgradeBalance.MAX_LEVEL,
    levels: [
      createFrostLevel(1, 0),
      createFrostLevel(2, FrostTowerBalance.LEVEL_2_COST_GOLD),
      createFrostLevel(3, FrostTowerBalance.LEVEL_3_COST_GOLD),
    ],
  },
  // Keyed by archetype id; the ARCHER_* balance constants describe the
  // single-target archetype.
  single: {
    maxLevel: TowerUpgradeBalance.MAX_LEVEL,
    levels: [
      {
        level: 1,
        upgradeCostGold: 0,
        stats: {
          damage: TowerCombatConfig.ARCHER_DAMAGE,
          range: TowerCombatConfig.ARCHER_RANGE_CELLS,
          attackCooldownMs: TowerCombatConfig.ARCHER_ATTACK_COOLDOWN_MS,
        },
      },
      {
        level: 2,
        upgradeCostGold: TowerUpgradeBalance.LEVEL_2_COST_GOLD,
        stats: {
          damage: TowerCombatConfig.ARCHER_DAMAGE + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL,
          range: TowerCombatConfig.ARCHER_RANGE_CELLS + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL,
          attackCooldownMs: TowerCombatConfig.ARCHER_ATTACK_COOLDOWN_MS - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL,
        },
      },
      {
        level: 3,
        upgradeCostGold: TowerUpgradeBalance.LEVEL_3_COST_GOLD,
        stats: {
          damage: TowerCombatConfig.ARCHER_DAMAGE + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL * 2,
          range: TowerCombatConfig.ARCHER_RANGE_CELLS + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL * 2,
          attackCooldownMs: TowerCombatConfig.ARCHER_ATTACK_COOLDOWN_MS - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL * 2,
        },
      },
    ],
  },
  splash: {
    maxLevel: TowerUpgradeBalance.MAX_LEVEL,
    levels: [
      {
        level: 1,
        upgradeCostGold: 0,
        stats: {
          damage: TowerCombatConfig.SPLASH_DAMAGE,
          range: TowerCombatConfig.SPLASH_RANGE_CELLS,
          attackCooldownMs: TowerCombatConfig.SPLASH_ATTACK_COOLDOWN_MS,
          splashRadius: TowerCombatConfig.SPLASH_RADIUS_CELLS,
        },
      },
      {
        level: 2,
        upgradeCostGold: TowerUpgradeBalance.LEVEL_2_COST_GOLD,
        stats: {
          damage: TowerCombatConfig.SPLASH_DAMAGE + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL,
          range: TowerCombatConfig.SPLASH_RANGE_CELLS + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL,
          attackCooldownMs: TowerCombatConfig.SPLASH_ATTACK_COOLDOWN_MS - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL,
          splashRadius: TowerCombatConfig.SPLASH_RADIUS_CELLS,
        },
      },
      {
        level: 3,
        upgradeCostGold: TowerUpgradeBalance.LEVEL_3_COST_GOLD,
        stats: {
          damage: TowerCombatConfig.SPLASH_DAMAGE + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL * 2,
          range: TowerCombatConfig.SPLASH_RANGE_CELLS + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL * 2,
          attackCooldownMs: TowerCombatConfig.SPLASH_ATTACK_COOLDOWN_MS - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL * 2,
          splashRadius: TowerCombatConfig.SPLASH_RADIUS_CELLS,
        },
      },
    ],
  },
};
