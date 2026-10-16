export {
  computeCreaturePathXpCost,
  selectBestCreatureBranch,
  valueCreatureBranch,
} from './branchValuation';
export {
  CREATURE_VALUATION,
  CREATURE_VALUATION_BY_DIFFICULTY,
  CreatureValuation,
} from './constants';
export { computeCreatureValue } from './creatureValue';
export { computeDefenceProfile, UNKNOWN_DEFENCE_PROFILE } from './defenceProfile';
export { planCreatureDevelopment } from './planCreatureDevelopment';
export { planContextDevelopment } from './planContextDevelopment';

export type { CreatureBranchValue, CreatureValuationContext } from './branchValuation';
export type { DamageShapeMix, DefenceProfile, EffectCoverage } from './defenceProfile';
export type {
  ChooseCreatureBranchAction,
  CreatureDevelopmentAction,
  CreatureDevelopmentInput,
  CreatureDevelopmentPlan,
  UpgradeCreatureAction,
} from './planCreatureDevelopment';
