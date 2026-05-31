import { describe, expect, it } from 'vitest';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import { Difficulty } from '../../difficulty/model/types';
import type { DecisionContext, DecisionOutput } from './types';
import { StrategyIntent } from './types';
import {
  COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT,
  createComputerDecisionDebugRecorder,
  createSendDecisionOutput,
} from './decisionDebugSnapshots';

function createTestContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 150,
    income: 20,
    hp: 18,
    raceId: RaceId.UNDEAD,
    difficulty: Difficulty.NORMAL,
    round: 2,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: 150,
      occupiedCells: 15,
      towerCount: 4,
    },
    threat: {
      incomingCreepCount: 6,
      estimatedLeakCount: 1,
      threatLevel: 'medium',
    },
    leakHistory: [],
    affordableTowers: [TowerTypeId.ARCHER],
    upgradeableTowerIds: ['tower_1'],
    availableBuildPositions: [{ x: 3, y: 5 }],
    ...overrides,
  };
}

describe('entities/computer-opponent/decisionDebugSnapshots', () => {
  it('records developer-facing build decision summaries', () => {
    const recorder = createComputerDecisionDebugRecorder();
    const context = createTestContext();
    const output: DecisionOutput = {
      intent: StrategyIntent.EXTEND_MAZE,
      actions: [{ kind: 'build', towerType: TowerTypeId.ARCHER, position: { x: 3, y: 5 } }],
      reasoning: 'Coverage is low, extending maze',
      confidenceScore: 0.8,
    };

    recorder.recordBuildDecision(context, output);

    expect(recorder.getSnapshots()).toEqual([
      {
        id: 1,
        round: 2,
        phase: 'build',
        kind: 'build',
        intent: StrategyIntent.EXTEND_MAZE,
        goldBefore: 150,
        incomeBefore: 20,
        hpBefore: 18,
        actionCount: 1,
        actionSummary: 'build archer at 3,5',
        reasoning: 'Coverage is low, extending maze',
        confidenceScore: 0.8,
        threatLevel: 'medium',
        incomingCreepCount: 6,
        estimatedLeakCount: 1,
        towerCount: 4,
        occupiedCells: 15,
        totalWalkableCells: 150,
      },
    ]);
  });

  it('keeps snapshots bounded as a ring buffer', () => {
    const recorder = createComputerDecisionDebugRecorder(2);
    const output: DecisionOutput = {
      intent: StrategyIntent.SAVE_GOLD,
      actions: [{ kind: 'save' }],
      reasoning: 'Saving gold',
      confidenceScore: 1,
    };

    recorder.recordBuildDecision(createTestContext({ round: 1 }), output);
    recorder.recordBuildDecision(createTestContext({ round: 2 }), output);
    recorder.recordBuildDecision(createTestContext({ round: 3 }), output);

    const snapshots = recorder.getSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((snapshot) => snapshot.round)).toEqual([2, 3]);
    expect(snapshots.map((snapshot) => snapshot.id)).toEqual([2, 3]);
  });

  it('defaults to the production-safe snapshot limit', () => {
    const recorder = createComputerDecisionDebugRecorder();
    const output: DecisionOutput = {
      intent: StrategyIntent.SAVE_GOLD,
      actions: [{ kind: 'save' }],
      reasoning: 'Saving gold',
      confidenceScore: 1,
    };

    for (let round = 1; round <= COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT + 1; round += 1) {
      recorder.recordBuildDecision(createTestContext({ round }), output);
    }

    expect(recorder.getSnapshots()).toHaveLength(COMPUTER_DECISION_DEBUG_SNAPSHOT_LIMIT);
    expect(recorder.getSnapshots()[0].round).toBe(2);
  });

  it('creates send decision output for optional send debug snapshots', () => {
    const output = createSendDecisionOutput(
      createTestContext({ intent: StrategyIntent.PRESSURE }),
      {
        actions: [{ kind: 'send_creep', creepTypeId: 'undead_ghoul' }],
        reasoning: 'Sending pressure creep',
      },
    );

    expect(output).toEqual({
      intent: StrategyIntent.PRESSURE,
      actions: [{ kind: 'send_creep', creepTypeId: 'undead_ghoul' }],
      reasoning: 'Sending pressure creep',
      confidenceScore: 0.75,
    });
  });

  it('clears snapshots and resets ids', () => {
    const recorder = createComputerDecisionDebugRecorder();
    const output: DecisionOutput = {
      intent: StrategyIntent.SAVE_GOLD,
      actions: [{ kind: 'save' }],
      reasoning: 'Saving gold',
      confidenceScore: 1,
    };

    recorder.recordBuildDecision(createTestContext(), output);
    recorder.clear();
    recorder.recordBuildDecision(createTestContext({ round: 5 }), output);

    expect(recorder.getSnapshots()).toHaveLength(1);
    expect(recorder.getSnapshots()[0].id).toBe(1);
    expect(recorder.getSnapshots()[0].round).toBe(5);
  });
});
