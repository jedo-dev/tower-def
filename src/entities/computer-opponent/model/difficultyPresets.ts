import { Difficulty } from '../../difficulty/model/types';

export type ComputerDifficultyPreset = {
  id: Difficulty;
  name: string;
  description: string;
  buildSpendRatio: number;
  sendSpendRatio: number;
  threatThresholdForDefense: 'low' | 'medium' | 'high';
  pressurePriority: number;
  upgradePriority: number;
  extendMazePriority: number;
};

export const COMPUTER_DIFFICULTY_PRESETS: Record<Difficulty, ComputerDifficultyPreset> = {
  [Difficulty.EASY]: {
    id: Difficulty.EASY,
    name: 'Relaxed',
    description: 'Conservative spending, defensive focus, minimal pressure.',
    buildSpendRatio: 0.3,
    sendSpendRatio: 0.2,
    threatThresholdForDefense: 'medium',
    pressurePriority: 0.2,
    upgradePriority: 0.4,
    extendMazePriority: 0.6,
  },
  [Difficulty.NORMAL]: {
    id: Difficulty.NORMAL,
    name: 'Balanced',
    description: 'Standard spending, balanced offense and defense.',
    buildSpendRatio: 0.5,
    sendSpendRatio: 0.35,
    threatThresholdForDefense: 'medium',
    pressurePriority: 0.5,
    upgradePriority: 0.5,
    extendMazePriority: 0.5,
  },
  [Difficulty.HARD]: {
    id: Difficulty.HARD,
    name: 'Aggressive',
    description: 'Higher spending, pressure-focused, faster escalation.',
    buildSpendRatio: 0.7,
    sendSpendRatio: 0.5,
    threatThresholdForDefense: 'high',
    pressurePriority: 0.7,
    upgradePriority: 0.6,
    extendMazePriority: 0.4,
  },
  [Difficulty.NIGHTMARE]: {
    id: Difficulty.NIGHTMARE,
    name: 'Relentless',
    description: 'Maximum spending, constant pressure.',
    buildSpendRatio: 0.9,
    sendSpendRatio: 0.7,
    threatThresholdForDefense: 'high',
    pressurePriority: 0.9,
    upgradePriority: 0.7,
    extendMazePriority: 0.3,
  },
};

export const DEFAULT_COMPUTER_PRESET = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL];

export function getComputerDifficultyPreset(difficulty: Difficulty): ComputerDifficultyPreset {
  return COMPUTER_DIFFICULTY_PRESETS[difficulty];
}
