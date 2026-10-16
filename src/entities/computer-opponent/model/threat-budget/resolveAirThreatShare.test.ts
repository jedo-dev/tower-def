import { describe, expect, it } from 'vitest';
import { RaceId, TowerTypeId } from '../../../../shared/types/content-ids';
import { Difficulty } from '../../../difficulty/model/types';
import { WAVE_AIR_UNIT_BUDGET_MULTIPLIER } from '../../../wave/model/waveBalance';
import type { DecisionContext } from '../types';
import {
  resolveAirLaneWeight,
  resolveAirThreatShare,
  toAirThreatShare,
} from './resolveAirThreatShare';
import type { DefenceAssessment } from './splitThreatBudget';

function contextWith(defence: DefenceAssessment | undefined): DecisionContext {
  return {
    gold: 200,
    income: 10,
    hp: 20,
    raceId: RaceId.HUMAN,
    difficulty: Difficulty.HARD,
    round: 12,
    phase: 'build',
    mazeCoverage: { totalWalkableCells: 150, occupiedCells: 5, towerCount: 2 },
    threat: { incomingCreepCount: 0, estimatedLeakCount: 0, threatLevel: 'low' },
    leakHistory: [],
    affordableTowers: [TowerTypeId.SINGLE],
    upgradeableTowerIds: [],
    availableBuildPositions: [],
    ...(defence ? { defence } : {}),
  };
}

/** Ground short of the comfortable margin, air comfortably held. */
const GROUND_SHORT: DefenceAssessment = {
  incomingHealth: 1000,
  waveDamage: 500,
  damagePerGold: 10,
  air: { incomingHealth: 300, waveDamage: 3000, damagePerGold: 10 },
  expectedAirHealthShare: 0.25,
};

describe('entities/computer-opponent threat-budget toAirThreatShare', () => {
  it('counts a flying hit point as many walking ones as the wave budget charges', () => {
    const share = 0.25;
    const air = share * WAVE_AIR_UNIT_BUDGET_MULTIPLIER;
    expect(toAirThreatShare(share)).toBeCloseTo(air / (1 - share + air), 10);
    expect(toAirThreatShare(share)).toBeGreaterThan(share);
  });

  it('keeps no fliers at 0 and an all-air wave at 1, and clamps out-of-range shares', () => {
    expect(toAirThreatShare(0)).toBe(0);
    expect(toAirThreatShare(1)).toBe(1);
    expect(toAirThreatShare(-0.5)).toBe(0);
    expect(toAirThreatShare(2)).toBe(1);
  });

  it('grows with the flier share', () => {
    expect(toAirThreatShare(0.1)).toBeLessThan(toAirThreatShare(0.2));
    expect(toAirThreatShare(0.2)).toBeLessThan(toAirThreatShare(0.4));
  });
});

describe('entities/computer-opponent threat-budget resolveAirLaneWeight', () => {
  it('keeps weighing the air lane while it holds and the maze does not', () => {
    const context = contextWith(GROUND_SHORT);
    expect(resolveAirThreatShare(context)).toBe(0);
    expect(resolveAirLaneWeight(context)).toBeCloseTo(toAirThreatShare(0.25), 10);
  });

  it('follows the defence spend when the air lane is the one short', () => {
    const context = contextWith({
      ...GROUND_SHORT,
      waveDamage: 10_000,
      air: { incomingHealth: 300, waveDamage: 0, damagePerGold: 10 },
    });
    expect(resolveAirThreatShare(context)).toBe(1);
    expect(resolveAirLaneWeight(context)).toBe(1);
  });

  it('is 0 without an assessment or without expected fliers', () => {
    expect(resolveAirLaneWeight(contextWith(undefined))).toBe(0);
    expect(
      resolveAirLaneWeight(
        contextWith({ incomingHealth: 1000, waveDamage: 500, damagePerGold: 10 }),
      ),
    ).toBe(0);
  });
});
