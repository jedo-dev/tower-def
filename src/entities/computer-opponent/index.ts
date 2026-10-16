export { StrategyIntent, STRATEGY_INTENTS } from './model/types';

export { buildDecisionContext } from './model/buildDecisionContext';
export {
  scoreTowerPlacement,
  scoreAllPlacements,
  DEFENSE_PLACEMENT_WEIGHTS,
  MAZE_PLACEMENT_WEIGHTS,
} from './model/scoreTowerPlacement';
export { planBuildDecision } from './model/planBuildDecision';
export { createComputerMazePlanMemory } from './model/computerMazePlanMemory';
export { planSendCreeps } from './model/planSendCreeps';
export { applyComputerBuildStrategy } from './model/applyComputerBuildStrategy';
export { applyComputerSendStrategy } from './model/applyComputerSendStrategy';
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
  EnemySnapshot,
  LeakHistoryEntry,
  MazeCoverageMetrics,
  SaveAction,
  SendCreepAction,
  ThreatAssessment,
  UpgradeAction,
  ChooseBranchAction,
} from './model/types';

export type { ComputerDecisionDebugRecorder } from './model/decisionDebugSnapshots';

export type { PlacementScore, PlacementWeights } from './model/scoreTowerPlacement';
export type { MazePlan, MazePlanPriority } from './model/maze-planning';
export type { ComputerMazePlanMemory } from './model/computerMazePlanMemory';
export type { BuildDecisionOutput, BuildPlannerInput } from './model/planBuildDecision';
export type {
  ApplyComputerBuildStrategyInput,
  ApplyComputerBuildStrategyResult,
} from './model/applyComputerBuildStrategy';
export type { SendPlannerInput, SendPlannerOutput } from './model/planSendCreeps';
export type {
  ApplyComputerSendStrategyInput,
  ApplyComputerSendStrategyResult,
} from './model/applyComputerSendStrategy';
export type { ComputerDifficultyPreset } from './model/difficultyPresets';
export type { DefenceAssessment } from './model/threat-budget';

export {
  computeTowerRouteCoverage,
  countRouteSamplesInRange,
  createMazeEvaluator,
  evaluateMaze,
  gainPerGold,
  MAZE_COVERAGE_WEIGHTS,
  MAZE_ROUTE_GAIN_WEIGHTS,
  routeGainForPlacement,
} from './model/maze-evaluation';
export type {
  MazeEvaluation,
  MazeEvaluator,
  MazeRoute,
  MazeRoutes,
  MazeSizeClassWeights,
  MazeTower,
  PlacementRouteGain,
  TowerRouteCoverage,
} from './model/maze-evaluation';
