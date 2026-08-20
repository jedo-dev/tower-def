import { describe, expect, it } from 'vitest';
import { RaceId } from '../../../shared/types/content-ids';
import { UnitTier } from '../../unit/model/types';
import {
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
} from './balance';
import { canAffordSendCreep, clearSendQueue, endRound, payIncome, sendCreep, startRound } from './lifecycle';
import { getIncomeBonusByTier, getSendCostByTier } from './sendEconomy';
import { createInitialDuelMatchState } from './state';
import type { DuelMatchState } from './types';

const ALL_TIERS = [
  UnitTier.TIER_1,
  UnitTier.TIER_2,
  UnitTier.TIER_3,
  UnitTier.TIER_4,
  UnitTier.TIER_5,
  UnitTier.TIER_6,
] as const;

// Both duelists greedily spam sends of one tier every build phase, then the
// round resolves without leaks. This is the fastest legal income ramp, so it
// bounds every real strategy from above.
function simulateGreedySendRounds(tier: UnitTier, rounds: number): DuelMatchState {
  let state = createInitialDuelMatchState(RaceId.UNDEAD, RaceId.ORC);

  for (let round = 0; round < rounds; round += 1) {
    let sendsThisRound = 0;
    while (canAffordSendCreep(state, true, tier) && sendsThisRound < 100) {
      state = sendCreep(state, true, 'undead_skeleton', tier).state;
      state = sendCreep(state, false, 'orc_grunt', tier).state;
      sendsThisRound += 1;
    }

    state = startRound(state).state;
    state = endRound(state, 0, 0).state;
    state = payIncome(state).state;
    state = clearSendQueue(state);
  }

  return state;
}

describe('duel balance simulation (deterministic)', () => {
  it('every send tier pays itself back in at least 3 rounds', () => {
    for (const tier of ALL_TIERS) {
      const paybackRounds = getSendCostByTier(tier) / getIncomeBonusByTier(tier);
      expect(paybackRounds).toBeGreaterThanOrEqual(3);
      expect(paybackRounds).toBeLessThanOrEqual(10);
    }
  });

  it('higher tiers cost more and yield more income', () => {
    for (let index = 1; index < ALL_TIERS.length; index += 1) {
      expect(SEND_CREEP_COST_BY_TIER[ALL_TIERS[index]]).toBeGreaterThan(
        SEND_CREEP_COST_BY_TIER[ALL_TIERS[index - 1]],
      );
      expect(SEND_CREEP_INCOME_BONUS_BY_TIER[ALL_TIERS[index]]).toBeGreaterThan(
        SEND_CREEP_INCOME_BONUS_BY_TIER[ALL_TIERS[index - 1]],
      );
    }
  });

  it('income efficiency per gold declines with tier (T1 is the pure eco pick)', () => {
    for (let index = 1; index < ALL_TIERS.length; index += 1) {
      const previousEfficiency =
        SEND_CREEP_INCOME_BONUS_BY_TIER[ALL_TIERS[index - 1]] /
        SEND_CREEP_COST_BY_TIER[ALL_TIERS[index - 1]];
      const efficiency =
        SEND_CREEP_INCOME_BONUS_BY_TIER[ALL_TIERS[index]] /
        SEND_CREEP_COST_BY_TIER[ALL_TIERS[index]];
      expect(efficiency).toBeLessThanOrEqual(previousEfficiency);
    }
  });

  it('greedy T1 spam does not produce runaway income within 20 rounds', () => {
    const state = simulateGreedySendRounds(UnitTier.TIER_1, 20);

    // Ramp exists but stays bounded: exponent base is (1 + bonus/cost) = 1.2
    // per full-reinvest cycle, so 20 rounds must stay far below hard caps.
    expect(state.player.income).toBeGreaterThan(50);
    expect(state.player.income).toBeLessThan(5_000);
    expect(state.player.gold).toBeLessThan(30_000);
  });

  it('greedy simulation is deterministic', () => {
    const first = simulateGreedySendRounds(UnitTier.TIER_1, 10);
    const second = simulateGreedySendRounds(UnitTier.TIER_1, 10);
    expect(second.player.income).toBe(first.player.income);
    expect(second.player.gold).toBe(first.player.gold);
    expect(second.opponent.income).toBe(first.opponent.income);
  });

  it('income ramp of the greedy strategy grows monotonically but sub-exponentially', () => {
    const incomes: number[] = [];
    for (let rounds = 1; rounds <= 12; rounds += 1) {
      incomes.push(simulateGreedySendRounds(UnitTier.TIER_1, rounds).player.income);
    }

    for (let index = 1; index < incomes.length; index += 1) {
      expect(incomes[index]).toBeGreaterThanOrEqual(incomes[index - 1]);
      // Growth factor per round stays under 1.5x — catches accidental
      // double-payout or compounding bugs early.
      expect(incomes[index]).toBeLessThanOrEqual(Math.ceil(incomes[index - 1] * 1.5) + 20);
    }
  });
});
