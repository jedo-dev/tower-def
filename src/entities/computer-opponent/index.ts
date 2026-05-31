export {
  StrategyIntent,
  STRATEGY_INTENTS,
} from './model/types';

export { buildDecisionContext } from './model/buildDecisionContext';
export { scoreTowerPlacement, scoreAllPlacements } from './model/scoreTowerPlacement';
export { planBuildDecision } from './model/planBuildDecision';
export { planSendCreeps } from './model/planSendCreeps';
export {
  COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT,
  createComputerDecisionDebugRecorder,
  createSendDecisionOutput,
} from './model/decisionDebugSnapshots';
export {
  COMPUTER_DIFFICULTY_PRESETS,
  DEFAULT_COMPUTER_PRESET,
  getComputerDifficultyPreset,
} from './model/difficultyPresets';

export type {
  BuildAction,
  ComputerAction,
  ComputerDecisionDebugKind,
  ComputerDecisionDebugSnapshot,
  ComputerOpponentStrategy,
  DecisionContext,
  DecisionOutput,
  LeakHistoryEntry,
  MazeCoverageMetrics,
  SaveAction,
  SendCreepAction,
  ThreatAssessment,
  UpgradeAction,
} from './model/types';

export type { ComputerDecisionDebugRecorder } from './model/decisionDebugSnapshots';

export type { PlacementScore } from './model/scoreTowerPlacement';
export type { BuildPlannerInput } from './model/planBuildDecision';
export type { SendPlannerInput, SendPlannerOutput } from './model/planSendCreeps';
export type { ComputerDifficultyPreset } from './model/difficultyPresets';
