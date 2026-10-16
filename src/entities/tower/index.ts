export {
  getTowerArchetype,
  getTowerAttackKind,
  getTowerOnHitEffects,
  resolveTowerChain,
  resolveTowerTargetScope,
  TOWER_ARCHETYPE_DEFINITIONS,
  TOWER_COMBAT_STATS_BY_TYPE,
} from './model/types';
export type {
  TowerArchetypeDefinition,
  TowerChainDefinition,
} from './model/content/loadTowerContent';
export {
  buildableTowers,
  getBuildableTowersByFaction,
  resolveBuildableTowerById,
  tryResolveBuildableTowerById,
} from './model/config/buildableTowers';
export {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './model/cooldown';
export {
  canTowerTargetCreep,
  getCreepsInTowerRange,
  getTowerCreepDistanceInCells,
  isCreepTargetableByTower,
  selectTowerTarget,
} from './model/targeting';
export {
  isCriticalShot,
  getConeHalfAngleCosine,
  isInCone,
  isPointOnPierceLine,
  resolveShotDamageMultiplier,
  resolveTargetDamageMultiplier,
} from './model/abilities';
export type { TowerAbilities, TowerGroundZone } from './model/abilities';
export {
  getTowerKillBonusGold,
  getTowersIncomePerRound,
  resolveTowerSellRefundRatio,
} from './model/auraEconomy';
export { getTowerCenter, isTowerCoveringCell } from './model/footprint';
export {
  applyAuraBonusToStats,
  createTowersWithAuras,
  recalculateTowerAuras,
  resolveTowerAuraBonus,
} from './model/auras';
export type { TowerAuraBonus } from './model/auras';
export {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForLevel,
  getTowerStatsForTowerLevel,
  getTowerStatsForCurveLevel,
  resolveTowerUpgradeConfig,
  toTowerUpgradeCurveRef,
  getUpgradeCost,
  isMaxLevel,
  createTowerLevel,
  INITIAL_TOWER_LEVEL,
} from './model/upgrade';
export type { TowerUpgradeCurveRef, UpgradeCheckResult } from './model/upgrade';
export {
  canChooseBranch,
  chooseBranch,
  getChosenBranchId,
  getTowerTalentBranches,
  NO_TOWER_BRANCH_CHOICES,
  resolveChosenBranch,
} from './model/talents';
export type {
  BranchChoiceCheck,
  BranchChoiceRejectionReason,
  TowerBranchChoices,
  TowerTalentBranchId,
  TowerTalentRef,
} from './model/talents';
export type { TowerTalentBranchDefinition } from './model/content/towerTalentContent';
export { resolveTowerPlacementStats } from './model/placementStats';
export { resolveBuildableTowerDamageType, resolveTowerDamageType } from './model/damageType';
export type {
  BuildableTowerConfig,
  BuildableTowerId,
  TowerOnHitEffect,
  BuildableTowerType,
  TowerCombatStats,
  TowerEntity,
  TowerId,
  TowerType,
  TowerLevelStats,
  TowerUpgradeLevel,
  TowerTypeUpgradeConfig,
} from './model/types';
export {
  BUILDABLE_TOWER_IDS,
  TowerTypeConfig,
  TOWER_UPGRADE_CONFIG,
  TowerUpgradeBalance,
  TOWER_BASE_LEVEL,
} from './model/types';
export type { TowerCombatRuntime } from './model/cooldown';
