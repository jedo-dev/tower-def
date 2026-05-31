import type { RaceId } from '../../../shared/types/content-ids';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { Difficulty } from '../../difficulty/model/types';
import type { UnitId } from '../../unit/model/types';

export const StrategyIntent = {
  DEFEND: 'defend',
  UPGRADE: 'upgrade',
  EXTEND_MAZE: 'extend_maze',
  SAVE_GOLD: 'save_gold',
  PRESSURE: 'pressure',
} as const;

export type StrategyIntent = (typeof StrategyIntent)[keyof typeof StrategyIntent];

export const STRATEGY_INTENTS: readonly StrategyIntent[] = [
  StrategyIntent.DEFEND,
  StrategyIntent.UPGRADE,
  StrategyIntent.EXTEND_MAZE,
  StrategyIntent.SAVE_GOLD,
  StrategyIntent.PRESSURE,
] as const;

export type MazeCoverageMetrics = {
  totalWalkableCells: number;
  occupiedCells: number;
  towerCount: number;
};

export type ThreatAssessment = {
  incomingCreepCount: number;
  estimatedLeakCount: number;
  threatLevel: 'low' | 'medium' | 'high';
};

export type LeakHistoryEntry = {
  round: number;
  leakedCount: number;
};

export type DecisionContext = {
  gold: number;
  income: number;
  hp: number;
  raceId: RaceId;
  difficulty: Difficulty;
  round: number;
  phase: 'build' | 'battle';
  mazeCoverage: MazeCoverageMetrics;
  threat: ThreatAssessment;
  leakHistory: readonly LeakHistoryEntry[];
  affordableTowers: readonly TowerTypeId[];
  upgradeableTowerIds: readonly string[];
  availableBuildPositions: readonly GridPosition[];
  intent?: StrategyIntent;
};

export type BuildAction = {
  kind: 'build';
  towerType: TowerTypeId;
  position: GridPosition;
};

export type UpgradeAction = {
  kind: 'upgrade';
  towerId: string;
};

export type SendCreepAction = {
  kind: 'send_creep';
  creepTypeId: UnitId;
};

export type SaveAction = {
  kind: 'save';
};

export type ComputerAction = BuildAction | UpgradeAction | SendCreepAction | SaveAction;

export type DecisionOutput = {
  intent: StrategyIntent;
  actions: readonly ComputerAction[];
  reasoning: string;
  confidenceScore: number;
};

export type ComputerOpponentStrategy = {
  difficulty: Difficulty;
  raceId: RaceId;
  currentIntent: StrategyIntent;
  decisionHistory: readonly DecisionOutput[];
};

export type ComputerDecisionDebugKind = 'build' | 'upgrade' | 'send' | 'save';

export type ComputerDecisionDebugSnapshot = {
  id: number;
  round: number;
  phase: DecisionContext['phase'];
  kind: ComputerDecisionDebugKind;
  intent: StrategyIntent;
  goldBefore: number;
  incomeBefore: number;
  hpBefore: number;
  actionCount: number;
  actionSummary: string;
  reasoning: string;
  confidenceScore: number;
  threatLevel: ThreatAssessment['threatLevel'];
  incomingCreepCount: number;
  estimatedLeakCount: number;
  towerCount: number;
  occupiedCells: number;
  totalWalkableCells: number;
};
