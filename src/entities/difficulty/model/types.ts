import { Difficulty } from '../../../shared/types/difficulty';

export { Difficulty };

/** Display data only; difficulty never scales creep stats or the economy. */
export type DifficultyConfig = {
  id: Difficulty;
  name: string;
  description: string;
};
