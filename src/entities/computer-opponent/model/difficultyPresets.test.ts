import { describe, expect, it } from 'vitest';
import { Difficulty } from '../../difficulty/model/types';
import {
  COMPUTER_DIFFICULTY_PRESETS,
  DEFAULT_COMPUTER_PRESET,
  getComputerDifficultyPreset,
} from './difficultyPresets';

describe('entities/computer-opponent/difficultyPresets', () => {
  describe('COMPUTER_DIFFICULTY_PRESETS', () => {
    it('contains presets for all difficulty levels', () => {
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.EASY]).toBeDefined();
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL]).toBeDefined();
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD]).toBeDefined();
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.NIGHTMARE]).toBeDefined();
    });

    it('each preset has required fields', () => {
      for (const difficulty of Object.values(Difficulty)) {
        const preset = COMPUTER_DIFFICULTY_PRESETS[difficulty];
        expect(preset.id).toBe(difficulty);
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.buildSpendRatio).toBeGreaterThanOrEqual(0);
        expect(preset.buildSpendRatio).toBeLessThanOrEqual(1);
        expect(preset.sendSpendRatio).toBeGreaterThanOrEqual(0);
        expect(preset.sendSpendRatio).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high']).toContain(preset.threatThresholdForDefense);
        expect(preset.pressurePriority).toBeGreaterThanOrEqual(0);
        expect(preset.pressurePriority).toBeLessThanOrEqual(1);
        expect(preset.upgradePriority).toBeGreaterThanOrEqual(0);
        expect(preset.upgradePriority).toBeLessThanOrEqual(1);
        expect(preset.extendMazePriority).toBeGreaterThanOrEqual(0);
        expect(preset.extendMazePriority).toBeLessThanOrEqual(1);
        expect(preset.handicapGoldBonus).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('spend ratios', () => {
    it('build spend ratio increases with difficulty', () => {
      const easy = COMPUTER_DIFFICULTY_PRESETS[Difficulty.EASY].buildSpendRatio;
      const normal = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL].buildSpendRatio;
      const hard = COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD].buildSpendRatio;
      const nightmare = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NIGHTMARE].buildSpendRatio;

      expect(easy).toBeLessThan(normal);
      expect(normal).toBeLessThan(hard);
      expect(hard).toBeLessThan(nightmare);
    });

    it('send spend ratio increases with difficulty', () => {
      const easy = COMPUTER_DIFFICULTY_PRESETS[Difficulty.EASY].sendSpendRatio;
      const normal = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL].sendSpendRatio;
      const hard = COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD].sendSpendRatio;
      const nightmare = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NIGHTMARE].sendSpendRatio;

      expect(easy).toBeLessThan(normal);
      expect(normal).toBeLessThan(hard);
      expect(hard).toBeLessThan(nightmare);
    });
  });

  describe('priority tuning', () => {
    it('relaxed preset is more defensive', () => {
      const easy = COMPUTER_DIFFICULTY_PRESETS[Difficulty.EASY];
      expect(easy.pressurePriority).toBeLessThan(easy.extendMazePriority);
      expect(easy.threatThresholdForDefense).toBe('medium');
    });

    it('aggressive preset is more pressure-focused', () => {
      const hard = COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD];
      expect(hard.pressurePriority).toBeGreaterThan(hard.extendMazePriority);
      expect(hard.threatThresholdForDefense).toBe('high');
    });

    it('nightmare preset has highest pressure priority', () => {
      const nightmare = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NIGHTMARE];
      const hard = COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD];
      expect(nightmare.pressurePriority).toBeGreaterThan(hard.pressurePriority);
    });
  });

  describe('handicap', () => {
    it('only nightmare has handicap gold bonus', () => {
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.EASY].handicapGoldBonus).toBe(0);
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL].handicapGoldBonus).toBe(0);
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.HARD].handicapGoldBonus).toBe(0);
      expect(COMPUTER_DIFFICULTY_PRESETS[Difficulty.NIGHTMARE].handicapGoldBonus).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_COMPUTER_PRESET', () => {
    it('is the normal difficulty preset', () => {
      expect(DEFAULT_COMPUTER_PRESET.id).toBe(Difficulty.NORMAL);
    });
  });

  describe('getComputerDifficultyPreset', () => {
    it('returns correct preset for each difficulty', () => {
      for (const difficulty of Object.values(Difficulty)) {
        const preset = getComputerDifficultyPreset(difficulty);
        expect(preset.id).toBe(difficulty);
      }
    });

    it('returns the same reference as COMPUTER_DIFFICULTY_PRESETS', () => {
      for (const difficulty of Object.values(Difficulty)) {
        const preset = getComputerDifficultyPreset(difficulty);
        expect(preset).toBe(COMPUTER_DIFFICULTY_PRESETS[difficulty]);
      }
    });
  });

  describe('determinism', () => {
    it('presets are immutable references', () => {
      const preset1 = getComputerDifficultyPreset(Difficulty.NORMAL);
      const preset2 = getComputerDifficultyPreset(Difficulty.NORMAL);
      expect(preset1).toBe(preset2);
    });
  });
});
