export { assessDefence } from './assessDefence';
export {
  ENEMY_SEND_INCOME_SHARE,
  MAX_SEND_SHARE,
  THREAT_BUDGET_TUNING_BY_DIFFICULTY,
} from './constants';
export { computeEffectiveHealth } from './effectiveHealth';
export { estimateDefenceCapability } from './estimateDefenceCapability';
export { estimateIncomingThreat } from './estimateIncomingThreat';
export {
  computeAirThreatShare,
  computeDefenceMargin,
  splitThreatBudget,
} from './splitThreatBudget';

export type { ThreatBudgetTuning } from './constants';
export type {
  DefenceCapability,
  DefenceCapabilityInput,
  DefenceWallPrice,
} from './estimateDefenceCapability';
export type { IncomingThreat, IncomingThreatInput } from './estimateIncomingThreat';
export type {
  DefenceAssessment,
  DefenceLaneAssessment,
  ThreatBudgetInput,
  ThreatBudgetSplit,
} from './splitThreatBudget';
