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

export const TOWER_UPGRADE_CONFIG: Record<string, TowerTypeUpgradeConfig> = {
  archer: {
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
