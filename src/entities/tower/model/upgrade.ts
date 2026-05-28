import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import type { TowerLevelStats } from '../../../shared/constants/tower';
import { TOWER_UPGRADE_CONFIG } from '../../../shared/constants/tower';
import type { TowerType } from './types';
import { TOWER_BASE_LEVEL } from './types';

export type UpgradeCheckResult = {
  allowed: boolean;
  reason?: 'max_level' | 'insufficient_gold';
};

export function isMaxLevel(towerType: TowerType, currentLevel: number): boolean {
  const config = TOWER_UPGRADE_CONFIG[towerType];
  if (!config) {
    return true;
  }
  return currentLevel >= config.maxLevel;
}

export function getUpgradeCost(towerType: TowerType, currentLevel: number): number | null {
  const config = TOWER_UPGRADE_CONFIG[towerType];
  if (!config) {
    return null;
  }

  const nextLevel = currentLevel + 1;
  const nextLevelConfig = config.levels.find((l) => l.level === nextLevel);
  if (!nextLevelConfig) {
    return null;
  }

  return nextLevelConfig.upgradeCostGold;
}

export function canAffordUpgrade(
  towerType: TowerType,
  currentLevel: number,
  currentGold: number,
): UpgradeCheckResult {
  if (isMaxLevel(towerType, currentLevel)) {
    return { allowed: false, reason: 'max_level' };
  }

  const upgradeCost = getUpgradeCost(towerType, currentLevel);
  if (upgradeCost === null) {
    return { allowed: false, reason: 'max_level' };
  }

  if (currentGold < upgradeCost) {
    return { allowed: false, reason: 'insufficient_gold' };
  }

  return { allowed: true };
}

export function getTowerStatsForLevel(
  towerType: TowerType,
  level: number,
): TowerLevelStats | null {
  const config = TOWER_UPGRADE_CONFIG[towerType];
  if (!config) {
    return null;
  }

  const levelConfig = config.levels.find((l) => l.level === level);
  if (!levelConfig) {
    return null;
  }

  return levelConfig.stats;
}

export function getTotalInvestedGold(towerType: TowerType, level: number): number {
  const config = TOWER_UPGRADE_CONFIG[towerType];
  if (!config) {
    return 0;
  }

  let total = 0;
  for (const levelConfig of config.levels) {
    if (levelConfig.level <= level) {
      total += levelConfig.upgradeCostGold;
    }
  }
  return total;
}

export function getSellValue(towerType: TowerType, level: number, buildCostGold: number): number {
  const totalInvested = getTotalInvestedGold(towerType, level) + buildCostGold;
  return Math.floor(totalInvested * ECONOMY_BALANCE.towerSellRatio);
}

export function createTowerLevel(
  towerType: TowerType,
  level: number,
): { level: number; combatStats: TowerLevelStats } | null {
  const stats = getTowerStatsForLevel(towerType, level);
  if (!stats) {
    return null;
  }
  return { level, combatStats: stats };
}

export const INITIAL_TOWER_LEVEL = TOWER_BASE_LEVEL;
