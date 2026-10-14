import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../difficulty/model/types';
import { SPEND_BUDGET_BY_DIFFICULTY } from './buildSpendBudget';
import { DECISION_MISTAKES_BY_DIFFICULTY } from './decisionMistakes';
import {
  COMPUTER_DIFFICULTY_PRESETS,
  DEFAULT_COMPUTER_PRESET,
  getComputerDifficultyPreset,
} from './difficultyPresets';
import { MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY } from './maze-planning';
import { SEND_TUNING_BY_DIFFICULTY } from './sendTuning';

const LADDER: readonly Difficulty[] = [
  Difficulty.EASY,
  Difficulty.NORMAL,
  Difficulty.HARD,
  Difficulty.NIGHTMARE,
];

describe('entities/computer-opponent/difficultyPresets', () => {
  describe('COMPUTER_DIFFICULTY_PRESETS', () => {
    it('names and describes every difficulty, each name distinct', () => {
      for (const difficulty of LADDER) {
        const preset = COMPUTER_DIFFICULTY_PRESETS[difficulty];
        expect(preset.id).toBe(difficulty);
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.description.length).toBeGreaterThan(0);
      }
      const names = LADDER.map((difficulty) => COMPUTER_DIFFICULTY_PRESETS[difficulty].name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('carries no stat or economy handicap at any difficulty', () => {
      for (const difficulty of LADDER) {
        expect(Object.keys(COMPUTER_DIFFICULTY_PRESETS[difficulty]).sort()).toEqual([
          'description',
          'id',
          'name',
        ]);
      }
    });
  });

  // Strength is ordered by decision quality alone (sim:duel-batch --matchups,
  // docs/07): build pace, plan search, send timing and deliberate mistakes.
  describe('decision ladder', () => {
    it('builds more towers a round at every step up', () => {
      const paces = LADDER.map(
        (difficulty) => SPEND_BUDGET_BY_DIFFICULTY[difficulty].maxBuildActionsPerRound,
      );
      for (let step = 1; step < paces.length; step += 1) {
        expect(paces[step]).toBeGreaterThan(paces[step - 1]);
      }
    });

    it('searches the maze plan hardest on nightmare', () => {
      const nightmare = MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY[Difficulty.NIGHTMARE];
      for (const difficulty of LADDER.slice(0, -1)) {
        const effort = MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY[difficulty];
        expect(nightmare.finalistCount).toBeGreaterThan(effort.finalistCount);
        expect(nightmare.maxExpandedNodes).toBeGreaterThan(effort.maxExpandedNodes);
      }
    });

    it('rushes pressure on hard and waits for income on nightmare', () => {
      const hard = SEND_TUNING_BY_DIFFICULTY[Difficulty.HARD];
      const nightmare = SEND_TUNING_BY_DIFFICULTY[Difficulty.NIGHTMARE];
      expect(hard.economyRounds).toBeLessThan(nightmare.economyRounds);
      expect(hard.basePressureWeight).toBeGreaterThan(nightmare.basePressureWeight);
    });

    it('sends as heavily as hard on normal, so build pace alone separates them', () => {
      // Normal's race balance needs the heavy opening (docs/07, tower-def-i55);
      // the normal < hard step is the build pace, 4 towers a round against 8.
      const normal = SEND_TUNING_BY_DIFFICULTY[Difficulty.NORMAL];
      const hard = SEND_TUNING_BY_DIFFICULTY[Difficulty.HARD];
      expect(normal.maxSendRatioPerRound).toBe(hard.maxSendRatioPerRound);
      expect(normal.maxSendsPerRound).toBe(hard.maxSendsPerRound);
      expect(normal.economyRounds).toBeLessThanOrEqual(hard.economyRounds);
      expect(SPEND_BUDGET_BY_DIFFICULTY[Difficulty.NORMAL].maxBuildActionsPerRound).toBeLessThan(
        SPEND_BUDGET_BY_DIFFICULTY[Difficulty.HARD].maxBuildActionsPerRound,
      );
    });

    it('makes the late-reaction mistake on easy only', () => {
      expect(DECISION_MISTAKES_BY_DIFFICULTY[Difficulty.EASY].leakReactionDelayRounds).toBe(1);
      for (const difficulty of LADDER.slice(1)) {
        expect(DECISION_MISTAKES_BY_DIFFICULTY[difficulty].leakReactionDelayRounds).toBe(0);
      }
    });
  });

  describe('lookup', () => {
    it('defaults to the normal preset', () => {
      expect(DEFAULT_COMPUTER_PRESET.id).toBe(Difficulty.NORMAL);
    });

    it('returns the shared preset for each difficulty', () => {
      for (const difficulty of LADDER) {
        expect(getComputerDifficultyPreset(difficulty)).toBe(
          COMPUTER_DIFFICULTY_PRESETS[difficulty],
        );
      }
    });
  });
});
