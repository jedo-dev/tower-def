export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  NIGHTMARE = 'NIGHTMARE',
}

export type DifficultyConfig = {
  id: Difficulty;
  name: string;
  description: string;
  startingGoldModifier: number;
  creepHealthModifier: number;
  creepSpeedModifier: number;
  rewardModifier: number;
};
