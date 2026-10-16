export {
  Faction,
  UNIT_IDS,
  UNIT_TIERS,
  UnitTier,
  type UnitConfig,
  type UnitId,
} from './model/types';
export { getUnitsByTier, undeadUnits } from './model/config/undead';
export { getOrcUnitsByTier, orcUnits } from './model/config/orc';
export { getHumanUnitsByTier, humanUnits } from './model/config/human';
export { getElfUnitsByTier, elfUnits } from './model/config/elf';
export {
  getAllUnitConfigs,
  getUnitsByFaction,
  resolveUnitConfigById,
  tryResolveUnitConfigById,
} from './model/registry';
export type { CreatureAbilities } from './model/abilities';
export type {
  CreatureGradeStats,
  CreatureTalentBranchDefinition,
} from './model/content/creatureTalentContent';
export {
  addCreatureXp,
  applyCreatureGrade,
  canChooseCreatureBranch,
  canUpgradeCreature,
  chooseCreatureBranch,
  getChosenCreatureBranchId,
  getCreatureBranchCost,
  getCreatureDeathXp,
  getCreatureGrade,
  getCreatureLeakXp,
  getCreatureXp,
  getNextCreatureGradeCost,
  NO_CREATURE_BRANCH_CHOICES,
  NO_CREATURE_GRADES,
  NO_CREATURE_XP,
  resolveChosenCreatureBranch,
  resolveCreatureStatsAtGrade,
  resolveCreatureStatsForGrade,
  upgradeCreature,
} from './model/talents';
export type {
  CreatureBranchChoices,
  CreatureBranchRejectionReason,
  CreatureGrade,
  CreatureGrades,
  CreatureTalentBranchId,
  CreatureTalentCheck,
  CreatureTalentLedger,
  CreatureTalentRef,
  CreatureTalentResult,
  CreatureUpgradeRejectionReason,
  CreatureXpByTier,
} from './model/talents';
