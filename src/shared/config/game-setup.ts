import type { BuilderFaction } from '../../entities/builder-faction';
import type { EnemyFaction } from '../../entities/enemy-faction';
import type { Difficulty } from '../../entities/difficulty';

export type GameSetupConfig = {
  builderFaction: BuilderFaction;
  enemyFaction: EnemyFaction;
  difficulty: Difficulty;
};

export type AppRoute = 'start' | 'setup' | 'game';
