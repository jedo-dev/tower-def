import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../../difficulty/model/types';
import { THREAT_BUDGET_TUNING_BY_DIFFICULTY } from './constants';
import { splitThreatBudget, type ThreatBudgetInput } from './splitThreatBudget';

const TUNING = THREAT_BUDGET_TUNING_BY_DIFFICULTY[Difficulty.NORMAL];
const GOLD = 400;
const MAX_SEND_SHARE = 0.35;
const MAX_BUILD_BUDGET = 240;
const CHEAPEST_SEND = 50;
const WAVE_HEALTH = 2_000;

/** A purse facing a 2,000-health wave with towers that deal `margin` times that. */
function inputAtMargin(margin: number, overrides?: Partial<ThreatBudgetInput>): ThreatBudgetInput {
  return {
    gold: GOLD,
    assessment: { incomingHealth: WAVE_HEALTH, waveDamage: WAVE_HEALTH * margin, damagePerGold: 4 },
    tuning: TUNING,
    maxSendShare: MAX_SEND_SHARE,
    maxBuildBudget: MAX_BUILD_BUDGET,
    livesShare: 1,
    cheapestSendCost: CHEAPEST_SEND,
    ...overrides,
  };
}

describe('entities/computer-opponent/threat-budget splitThreatBudget', () => {
  it('shifts the budget to defence under high threat', () => {
    const split = splitThreatBudget(inputAtMargin(0.3));

    expect(split.margin).toBeCloseTo(0.3);
    expect(split.comfort).toBe(0);
    expect(split.defenceShortfallGold).toBeGreaterThan(GOLD);
    expect(split.buildBudget).toBe(MAX_BUILD_BUDGET);
    // Only the income floor is left for sends.
    expect(split.sendBudget).toBe(Math.floor(GOLD * MAX_SEND_SHARE * TUNING.threatenedSendScale));
  });

  it('keeps buying one cheap income creep from a small purse while lives allow', () => {
    const split = splitThreatBudget(inputAtMargin(0.3, { gold: 150 }));

    expect(split.sendBudget).toBe(CHEAPEST_SEND);
  });

  it('shifts the budget to sends under low threat', () => {
    const split = splitThreatBudget(inputAtMargin(3));

    expect(split.comfort).toBe(1);
    expect(split.defenceShortfallGold).toBe(0);
    expect(split.sendBudget).toBeGreaterThan(GOLD * MAX_SEND_SHARE);
    expect(split.buildBudget).toBe(
      Math.floor(MAX_BUILD_BUDGET * TUNING.comfortableBuildSpendScale),
    );
  });

  it('sends less and builds more as the threat grows', () => {
    const margins = [3, 2, 1.6, 1.2, 0.8, 0.3];
    const splits = margins.map((margin) => splitThreatBudget(inputAtMargin(margin)));

    for (let index = 1; index < splits.length; index += 1) {
      expect(splits[index].sendBudget).toBeLessThanOrEqual(splits[index - 1].sendBudget);
      expect(splits[index].buildBudget).toBeGreaterThanOrEqual(splits[index - 1].buildBudget);
    }
    expect(splits[0].sendBudget).toBeGreaterThan(splits[splits.length - 1].sendBudget);
  });

  it('leaves the gold defence needs before sends take theirs', () => {
    // Short of comfortable, by less than the purse.
    const split = splitThreatBudget(inputAtMargin(TUNING.comfortableMargin - 0.4));

    expect(split.defenceShortfallGold).toBeGreaterThan(0);
    expect(split.defenceShortfallGold).toBeLessThan(GOLD);
    expect(split.sendBudget).toBeLessThanOrEqual(GOLD - split.defenceShortfallGold);
  });

  it('stops investing in income once the lives run low', () => {
    const healthy = splitThreatBudget(inputAtMargin(0.3, { livesShare: 1 }));
    const dying = splitThreatBudget(inputAtMargin(0.3, { livesShare: 0.2 }));

    expect(dying.sendBudget).toBeLessThan(healthy.sendBudget);
    expect(dying.sendBudget).toBeLessThan(CHEAPEST_SEND);
  });

  it('never splits more than the purse', () => {
    for (const gold of [0, 30, 60, 400, 5_000]) {
      for (const margin of [0, 0.5, 1.5, 10]) {
        const split = splitThreatBudget(inputAtMargin(margin, { gold }));
        expect(split.sendBudget).toBeGreaterThanOrEqual(0);
        expect(split.sendBudget).toBeLessThanOrEqual(gold);
        expect(split.buildBudget).toBeLessThanOrEqual(MAX_BUILD_BUDGET);
      }
    }
  });

  it('treats a field with no wave coming as fully comfortable', () => {
    const split = splitThreatBudget(
      inputAtMargin(1, { assessment: { incomingHealth: 0, waveDamage: 0, damagePerGold: 4 } }),
    );

    expect(split.margin).toBe(Infinity);
    expect(split.comfort).toBe(1);
    expect(split.defenceShortfallGold).toBe(0);
  });

  it('is deterministic', () => {
    expect(splitThreatBudget(inputAtMargin(1.3))).toEqual(splitThreatBudget(inputAtMargin(1.3)));
  });
});
