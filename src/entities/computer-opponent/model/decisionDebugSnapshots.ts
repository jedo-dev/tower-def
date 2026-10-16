import type {
  ComputerAction,
  ComputerDecisionDebugKind,
  ComputerDecisionDebugSnapshot,
  DecisionContext,
  DecisionOutput,
} from './types';
import { StrategyIntent } from './types';
import type { CreatureDevelopmentAction } from './creature-development';

export const COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT = 24;

export type ComputerDecisionDebugRecorder = {
  recordBuildDecision(context: DecisionContext, output: DecisionOutput): void;
  recordSendDecision(context: DecisionContext, output: DecisionOutput): void;
  getSnapshots(): readonly ComputerDecisionDebugSnapshot[];
  clear(): void;
};

function summarizeActions(actions: readonly ComputerAction[]): string {
  if (actions.length === 0) {
    return 'no actions';
  }

  return actions
    .map((action) => {
      switch (action.kind) {
        case 'build':
          return `build ${action.towerType} at ${action.position.x},${action.position.y}`;
        case 'upgrade':
          return `upgrade ${action.towerId}`;
        case 'choose_branch':
          return `develop ${action.towerId} along ${action.branchId}`;
        case 'send_creep':
          return `send ${action.creepTypeId}`;
        case 'choose_creature_branch':
          return `develop ${action.unitId} along ${action.branchId}`;
        case 'upgrade_creature':
          return `grade ${action.unitId}`;
        case 'save':
          return 'save gold';
      }
    })
    .join('; ');
}

function resolveDebugKind(actions: readonly ComputerAction[]): ComputerDecisionDebugKind {
  if (actions.some((action) => action.kind === 'send_creep')) {
    return 'send';
  }

  if (
    actions.some(
      (action) =>
        action.kind === 'upgrade' ||
        action.kind === 'choose_branch' ||
        action.kind === 'choose_creature_branch' ||
        action.kind === 'upgrade_creature',
    )
  ) {
    return 'upgrade';
  }

  if (actions.some((action) => action.kind === 'build')) {
    return 'build';
  }

  return 'save';
}

function createSnapshot(
  id: number,
  context: DecisionContext,
  output: DecisionOutput,
): ComputerDecisionDebugSnapshot {
  return {
    id,
    round: context.round,
    phase: context.phase,
    kind: resolveDebugKind(output.actions),
    intent: output.intent,
    goldBefore: context.gold,
    incomeBefore: context.income,
    hpBefore: context.hp,
    actionCount: output.actions.length,
    actionSummary: summarizeActions(output.actions),
    reasoning: output.reasoning,
    confidenceScore: output.confidenceScore,
    threatLevel: context.threat.threatLevel,
    incomingCreepCount: context.threat.incomingCreepCount,
    estimatedLeakCount: context.threat.estimatedLeakCount,
    towerCount: context.mazeCoverage.towerCount,
    occupiedCells: context.mazeCoverage.occupiedCells,
    totalWalkableCells: context.mazeCoverage.totalWalkableCells,
  };
}

export function createComputerDecisionDebugRecorder(
  limit = COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT,
): ComputerDecisionDebugRecorder {
  const snapshots: ComputerDecisionDebugSnapshot[] = [];
  const boundedLimit = Math.max(1, Math.floor(limit));
  let nextId = 1;

  function record(output: DecisionOutput, context: DecisionContext): void {
    if (snapshots.length === boundedLimit) {
      snapshots.shift();
    }

    snapshots.push(createSnapshot(nextId, context, output));
    nextId += 1;
  }

  return {
    recordBuildDecision(context, output) {
      record(output, context);
    },
    recordSendDecision(context, output) {
      record(output, context);
    },
    getSnapshots() {
      return snapshots;
    },
    clear() {
      snapshots.length = 0;
      nextId = 1;
    },
  };
}

export function createSendDecisionOutput(
  context: DecisionContext,
  output: {
    actions: readonly Extract<ComputerAction, { kind: 'send_creep' }>[];
    developmentActions?: readonly CreatureDevelopmentAction[];
    reasoning: string;
  },
): DecisionOutput {
  return {
    intent: context.intent ?? StrategyIntent.PRESSURE,
    // Development first: a send spawns at the grade it was queued with.
    actions: [...(output.developmentActions ?? []), ...output.actions],
    reasoning: output.reasoning,
    confidenceScore: output.actions.length > 0 ? 0.75 : 1,
  };
}
