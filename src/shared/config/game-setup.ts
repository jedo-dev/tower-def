import type { BuilderFaction } from '../../entities/builder-faction';
import type { EnemyFaction } from '../../entities/enemy-faction';
import type { Difficulty } from '../../entities/difficulty';

export type GameSetupEndpoints =
  | { mode: 'fixed' }
  | { mode: 'dynamic'; seed: number };

export type GameSetupConfig = {
  builderFaction: BuilderFaction;
  enemyFaction: EnemyFaction;
  difficulty: Difficulty;
  endpoints?: GameSetupEndpoints;
};

export type AppRoute = 'start' | 'setup' | 'game' | 'settings';
