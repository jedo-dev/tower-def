import { Difficulty, type DifficultyConfig } from '../types';

export const difficulties: DifficultyConfig[] = [
  {
    id: Difficulty.EASY,
    name: 'Easy',
    description: 'Relaxed gameplay for beginners.',
    startingGoldModifier: 1.5,
    creepHealthModifier: 0.7,
    creepSpeedModifier: 0.8,
    rewardModifier: 1.25,
  },
  {
    id: Difficulty.NORMAL,
    name: 'Normal',
    description: 'Standard challenge for experienced players.',
    startingGoldModifier: 1.0,
    creepHealthModifier: 1.0,
    creepSpeedModifier: 1.0,
    rewardModifier: 1.0,
  },
  {
    id: Difficulty.HARD,
    name: 'Hard',
    description: 'Tough opponents for veterans.',
    startingGoldModifier: 0.8,
    creepHealthModifier: 1.3,
    creepSpeedModifier: 1.15,
    rewardModifier: 0.85,
  },
  {
    id: Difficulty.NIGHTMARE,
    name: 'Nightmare',
    description: 'Extreme difficulty for the brave.',
    startingGoldModifier: 0.6,
    creepHealthModifier: 1.7,
    creepSpeedModifier: 1.35,
    rewardModifier: 0.7,
  },
];

export const DEFAULT_DIFFICULTY = Difficulty.NORMAL;
