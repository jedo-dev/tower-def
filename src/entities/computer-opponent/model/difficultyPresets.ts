import { Difficulty } from '../../difficulty/model/types';

/**
 * Display data of a computer difficulty. The decision parameters live next
 * to the planners that read them (see docs/07, "Difficulty presets"):
 * `SPEND_BUDGET_BY_DIFFICULTY`, `SEND_TUNING_BY_DIFFICULTY`,
 * `THREAT_BUDGET_TUNING_BY_DIFFICULTY`, `MAZE_PLAN_SEARCH_EFFORT_BY_DIFFICULTY`
 * and `DECISION_MISTAKES_BY_DIFFICULTY`. Difficulty never changes stats or
 * the economy, only how well the computer decides.
 */
export type ComputerDifficultyPreset = {
  id: Difficulty;
  name: string;
  description: string;
};

export const COMPUTER_DIFFICULTY_PRESETS: Record<Difficulty, ComputerDifficultyPreset> = {
  [Difficulty.EASY]: {
    id: Difficulty.EASY,
    name: 'Novice',
    description: 'Builds a few towers a round and notices leaks a round late.',
  },
  [Difficulty.NORMAL]: {
    id: Difficulty.NORMAL,
    name: 'Steady',
    description: 'Builds at a steady pace and grows its income before it pressures.',
  },
  [Difficulty.HARD]: {
    id: Difficulty.HARD,
    name: 'Expert',
    description: 'Builds as fast as it can afford, but rushes heavy sends early.',
  },
  [Difficulty.NIGHTMARE]: {
    id: Difficulty.NIGHTMARE,
    name: 'Master',
    description: 'Builds fastest, searches its maze hardest and times its sends best.',
  },
};

export const DEFAULT_COMPUTER_PRESET = COMPUTER_DIFFICULTY_PRESETS[Difficulty.NORMAL];

export function getComputerDifficultyPreset(difficulty: Difficulty): ComputerDifficultyPreset {
  return COMPUTER_DIFFICULTY_PRESETS[difficulty];
}
