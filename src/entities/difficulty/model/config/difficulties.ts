import { Difficulty, type DifficultyConfig } from '../types';

export const difficulties: DifficultyConfig[] = [
  {
    id: Difficulty.EASY,
    name: 'Easy',
    description: 'Relaxed gameplay for beginners.',
  },
  {
    id: Difficulty.NORMAL,
    name: 'Normal',
    description: 'Standard challenge for experienced players.',
  },
  {
    id: Difficulty.HARD,
    name: 'Hard',
    description: 'Tough opponents for veterans.',
  },
  {
    id: Difficulty.NIGHTMARE,
    name: 'Nightmare',
    description: 'Extreme difficulty for the brave.',
  },
];

export const DEFAULT_DIFFICULTY = Difficulty.NORMAL;
