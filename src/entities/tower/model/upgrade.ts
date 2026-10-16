import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import type { TowerLevelStats, TowerTypeUpgradeConfig } from './upgradeConfig';
import type { TowerEntity, TowerType } from './types';
import { TOWER_BASE_LEVEL, TOWER_UPGRADE_CONFIG } from './types';
import { tryResolveBuildableTowerById } from './config/buildableTowers';
import { BUILDABLE_TOWER_IDS, type BuildableTowerId } from './towerIds';
import { NO_TOWER_BRANCH_CHOICES, resolveChosenBranch, type TowerBranchChoices } from './talents';

/** What picks a tower's upgrade curve: its archetype and, if any, its authored id. */
export type TowerUpgradeCurveRef = Pick<TowerEntity, 'type' | 'buildableTowerId'>;

export type UpgradeCheckResult = {
  allowed: boolean;
  reason?: 'max_level' | 'insufficient_gold';
};

/**
 * Upgrade curve a placed tower follows. Levels 1-3 come from its own authored
 * curve when it declares one, the archetype curve otherwise; grades 4-7 come
 * from the branch its side chose for the tower's type. Without a branch the
 * curve tops out at grade 3. Cost, max level, stats, preview and sell value all
 * read this one curve.
 */
export function resolveTowerUpgradeConfig(
  tower: TowerUpgradeCurveRef,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): TowerTypeUpgradeConfig {
  const authored = tower.buildableTowerId
    ? tryResolveBuildableTowerById(tower.buildableTowerId)
    : undefined;
  const baseLevels =
    authored?.levels && authored.levels.length > 0
      ? authored.levels
      : TOWER_UPGRADE_CONFIG[tower.type].levels;
  const branch = resolveChosenBranch(tower, choices);
  const levels = branch ? [...baseLevels, ...branch.grades] : baseLevels;

  return { maxLevel: levels.length, levels };
}

function findCurveLevel(
  tower: TowerUpgradeCurveRef,
  level: number,
  choices: TowerBranchChoices,
): TowerTypeUpgradeConfig['levels'][number] | undefined {
  return resolveTowerUpgradeConfig(tower, choices).levels.find(
    (candidate) => candidate.level === level,
  );
}

export function isMaxLevel(
  tower: TowerUpgradeCurveRef,
  currentLevel: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): boolean {
  return currentLevel >= resolveTowerUpgradeConfig(tower, choices).maxLevel;
}

export function getUpgradeCost(
  tower: TowerUpgradeCurveRef,
  currentLevel: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): number | null {
  return findCurveLevel(tower, currentLevel + 1, choices)?.upgradeCostGold ?? null;
}

export function canAffordUpgrade(
  tower: TowerUpgradeCurveRef,
  currentLevel: number,
  currentGold: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): UpgradeCheckResult {
  const upgradeCost = isMaxLevel(tower, currentLevel, choices)
    ? null
    : getUpgradeCost(tower, currentLevel, choices);

  if (upgradeCost === null) {
    return { allowed: false, reason: 'max_level' };
  }

  if (currentGold < upgradeCost) {
    return { allowed: false, reason: 'insufficient_gold' };
  }

  return { allowed: true };
}

/** The archetype curve alone, for callers that hold no tower (content checks, previews). */
export function getTowerStatsForLevel(towerType: TowerType, level: number): TowerLevelStats | null {
  const levelConfig = TOWER_UPGRADE_CONFIG[towerType]?.levels.find(
    (candidate) => candidate.level === level,
  );
  return levelConfig ? levelConfig.stats : null;
}

/** Upgrade gold a tower took to reach `level`; the branch price is per type and not included. */
export function getTotalInvestedGold(
  tower: TowerUpgradeCurveRef,
  level: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): number {
  let total = 0;
  for (const levelConfig of resolveTowerUpgradeConfig(tower, choices).levels) {
    if (levelConfig.level <= level) {
      total += levelConfig.upgradeCostGold;
    }
  }
  return total;
}

export function getSellValue(
  tower: TowerUpgradeCurveRef,
  level: number,
  buildCostGold: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): number {
  const totalInvested = getTotalInvestedGold(tower, level, choices) + buildCostGold;
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

export function getTowerStatsForTowerLevel(
  tower: TowerUpgradeCurveRef,
  level: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): TowerLevelStats | null {
  return findCurveLevel(tower, level, choices)?.stats ?? null;
}

/**
 * A curve reference read from ids alone, for UI that only holds a bridge
 * snapshot: an unknown authored id falls back to the archetype curve.
 */
export function toTowerUpgradeCurveRef(
  towerType: TowerType,
  buildableTowerId: string | undefined,
): TowerUpgradeCurveRef {
  const authoredId: BuildableTowerId | undefined = BUILDABLE_TOWER_IDS.find(
    (towerId) => towerId === buildableTowerId,
  );
  return { type: towerType, buildableTowerId: authoredId };
}

/** `getTowerStatsForTowerLevel` from ids alone; see `toTowerUpgradeCurveRef`. */
export function getTowerStatsForCurveLevel(
  towerType: TowerType,
  buildableTowerId: string | undefined,
  level: number,
  choices: TowerBranchChoices = NO_TOWER_BRANCH_CHOICES,
): TowerLevelStats | null {
  return getTowerStatsForTowerLevel(
    toTowerUpgradeCurveRef(towerType, buildableTowerId),
    level,
    choices,
  );
}
