import { Difficulty, type DifficultyConfig } from '../types';

export const difficulties: DifficultyConfig[] = [
  {
    id: Difficulty.EASY,
    name: 'Easy',
    description: 'The computer builds slowly and reacts late to leaks.',
  },
  {
    id: Difficulty.NORMAL,
    name: 'Normal',
    description: 'The computer builds at a steady pace and invests before it attacks.',
  },
  {
    id: Difficulty.HARD,
    name: 'Hard',
    description: 'The computer builds at full speed but attacks too early.',
  },
  {
    id: Difficulty.NIGHTMARE,
    name: 'Nightmare',
    description: 'The computer plays its best: fastest builds, deepest maze search, patient sends.',
  },
];

export const DEFAULT_DIFFICULTY = Difficulty.NORMAL;
