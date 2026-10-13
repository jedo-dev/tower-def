export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  NIGHTMARE = 'NIGHTMARE',
}

/** Display data only; difficulty never scales creep stats or the economy. */
export type DifficultyConfig = {
  id: Difficulty;
  name: string;
  description: string;
};
