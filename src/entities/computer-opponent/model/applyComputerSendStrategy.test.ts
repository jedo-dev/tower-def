import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { getIncomeBonusByTier, getSendCostByTier } from '../../duel-match/model/sendEconomy';
import { createInitialDuelMatchState } from '../../duel-match/model/state';
import type { DuelMatchState } from '../../duel-match/model/types';
import { Difficulty } from '../../difficulty/model/types';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type { DecisionContext } from './types';
import { StrategyIntent } from './types';
import { applyComputerSendStrategy } from './applyComputerSendStrategy';

const PLAYER_RACE = RaceId.HUMAN;
const OPPONENT_RACE = RaceId.ORC;

function createState(overrides?: Partial<DuelMatchState>): DuelMatchState {
  return {
    ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE),
    ...overrides,
  };
}

function createContext(overrides?: Partial<DecisionContext>): DecisionContext {
  return {
    gold: 500,
    income: 50,
    hp: 20,
    raceId: OPPONENT_RACE,
    difficulty: Difficulty.NORMAL,
    round: 1,
    phase: 'build',
    mazeCoverage: {
      totalWalkableCells: 150,
      occupiedCells: 20,
      towerCount: 4,
    },
    threat: {
      incomingCreepCount: 0,
      estimatedLeakCount: 0,
      threatLevel: 'low',
    },
    leakHistory: [],
    affordableTowers: [],
    upgradeableTowerIds: [],
    availableBuildPositions: [],
    intent: StrategyIntent.PRESSURE,
    ...overrides,
  };
}

describe('entities/computer-opponent/applyComputerSendStrategy', () => {
  it('uses opponent race registry, costs, and income rules when adding computer sends', () => {
    const state = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 500,
        income: 50,
      },
    });
    const context = createContext({ gold: state.opponent.gold, income: state.opponent.income });
    const registry = getRaceRegistry(OPPONENT_RACE);

    const result = applyComputerSendStrategy({ state, context });

    expect(result.sentCount).toBeGreaterThan(0);
    expect(result.state.opponent.sendQueue).toEqual(result.decision.actions.map((action) => action.creepTypeId));
    expect(result.state.opponent.sendQueue.every((unitId) => registry.sendableCreepIds.includes(unitId))).toBe(true);
    expect(result.spentGold).toBe(result.decision.totalCost);
    expect(result.incomeGained).toBe(result.decision.totalIncomeBonus);
    expect(result.state.opponent.gold).toBe(state.opponent.gold - result.spentGold);
    expect(result.state.opponent.income).toBe(state.opponent.income + result.incomeGained);

    const expectedCost = result.state.opponent.sendQueue.reduce((total, unitId) => {
      const unitConfig = resolveUnitConfigById(unitId);
      return total + getSendCostByTier(unitConfig.tier);
    }, 0);
    const expectedIncome = result.state.opponent.sendQueue.reduce((total, unitId) => {
      const unitConfig = resolveUnitConfigById(unitId);
      return total + getIncomeBonusByTier(unitConfig.tier);
    }, 0);

    expect(result.spentGold).toBe(expectedCost);
    expect(result.incomeGained).toBe(expectedIncome);
  });

  it('is deterministic for identical computer send inputs', () => {
    const state = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 700,
      },
    });
    const context = createContext({ gold: state.opponent.gold });

    const firstResult = applyComputerSendStrategy({ state, context });
    const secondResult = applyComputerSendStrategy({ state, context });

    expect(firstResult).toEqual(secondResult);
  });

  it('preserves duel economy state when the planner decides not to send', () => {
    const state = createState({
      opponent: {
        ...createInitialDuelMatchState(PLAYER_RACE, OPPONENT_RACE).opponent,
        gold: 1000,
        income: 50,
      },
    });
    const context = createContext({
      gold: state.opponent.gold,
      threat: {
        incomingCreepCount: 12,
        estimatedLeakCount: 3,
        threatLevel: 'high',
      },
    });

    const result = applyComputerSendStrategy({ state, context });

    expect(result.sentCount).toBe(0);
    expect(result.spentGold).toBe(0);
    expect(result.incomeGained).toBe(0);
    expect(result.state).toBe(state);
    expect(result.decision.actions).toEqual([]);
  });
});
