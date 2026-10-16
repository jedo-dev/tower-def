import type { RaceId } from '../../../shared/types/content-ids';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { Difficulty } from '../../difficulty/model/types';
import type { UnitId } from '../../unit/model/types';
import type { DamageTypeMix } from './damage-profile';
import type { DefenceAssessment } from './threat-budget/splitThreatBudget';

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

/**
 * What the opponent can see of the other duelist. Optional because a decision
 * is still well defined without it: the send planner then compares its economy
 * against its own instead of against the enemy's.
 */
export type EnemySnapshot = {
  hp: number;
  income: number;
  towerCount: number;
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
  enemy?: EnemySnapshot;
  intent?: StrategyIntent;
  /** Creeps this side already queued for the coming wave; none when omitted. */
  queuedSends?: readonly UnitId[];
  /**
   * The expected next wave against this side's defence. When present, gold is
   * split between defence and sends by threat; omitted, the planners fall
   * back to the difficulty's fixed spend ratios.
   */
  defence?: DefenceAssessment;
  /**
   * Damage types the other duelist's towers deal, as shares of their raw
   * damage. The send planner values its creeps' armor against it; an even
   * physical/magical mix when omitted.
   */
  enemyDamageMix?: DamageTypeMix;
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
