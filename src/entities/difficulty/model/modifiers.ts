import { difficulties, DEFAULT_DIFFICULTY } from './config/difficulties';
import { Difficulty, type DifficultyConfig } from './types';

export type CreepStatInput = {
  health: number;
  speed: number;
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return (
    difficulties.find((config) => config.id === difficulty) ??
    difficulties.find((config) => config.id === DEFAULT_DIFFICULTY) ??
    difficulties[0]
  );
}

export function scaleStartingGold(baseGold: number, difficulty: Difficulty): number {
  return Math.round(baseGold * getDifficultyConfig(difficulty).startingGoldModifier);
}

export function scaleReward(baseReward: number, difficulty: Difficulty): number {
  return Math.round(baseReward * getDifficultyConfig(difficulty).rewardModifier);
}

/**
 * Scales the creeps that attack the player. Health is an integer with a floor
 * of 1; speed stays fractional (unit speeds live around 1.0-1.5) and keeps two
 * decimals so a lenient preset cannot stall a creep on the path.
 */
export function scaleCreepStats(stats: CreepStatInput, difficulty: Difficulty): CreepStatInput {
  const config = getDifficultyConfig(difficulty);
  return {
    health: Math.max(1, Math.round(stats.health * config.creepHealthModifier)),
    speed: Math.max(0.1, Number((stats.speed * config.creepSpeedModifier).toFixed(2))),
  };
}
