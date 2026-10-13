import { difficulties, DEFAULT_DIFFICULTY } from './config/difficulties';
import { Difficulty, type DifficultyConfig } from './types';

/**
 * Difficulty only tunes the computer opponent's decisions (see
 * computer-opponent difficulty presets). It never scales creep stats or the
 * economy: both sides play with identical numbers at every preset.
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return (
    difficulties.find((config) => config.id === difficulty) ??
    difficulties.find((config) => config.id === DEFAULT_DIFFICULTY) ??
    difficulties[0]
  );
}
