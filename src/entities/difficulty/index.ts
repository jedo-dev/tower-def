export { Difficulty, type DifficultyConfig } from './model/types';
export { difficulties, DEFAULT_DIFFICULTY } from './model/config/difficulties';
export {
  getDifficultyConfig,
  scaleCreepStats,
  scaleReward,
  scaleStartingGold,
  type CreepStatInput,
} from './model/modifiers';
