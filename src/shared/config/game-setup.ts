import type { RaceId } from '../types/content-ids';
import type { Difficulty } from '../types/difficulty';

export type GameSetupEndpoints = { mode: 'fixed' } | { mode: 'dynamic'; seed: number };

/**
 * `BuilderFaction` and `EnemyFaction` in `entities` are the same `RaceId`
 * enum, so the setup config names the shared id directly and stays free of
 * entity imports.
 */
export type GameSetupConfig = {
  builderFaction: RaceId;
  enemyFaction: RaceId;
  difficulty: Difficulty;
  endpoints?: GameSetupEndpoints;
};

export type AppRoute = 'start' | 'setup' | 'game' | 'settings' | 'bestiary';
