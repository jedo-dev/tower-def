import type { RaceId } from '../../../shared/types/content-ids';
import type { GridPoint, GridModel } from '../../../shared/types/grid';
import type { WaveRoutes } from '../../../shared/lib/pathfinding/waveRoutes';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { calculateWaveRoutes } from '../../wave/model/calculateWavePath';
import { DUEL_MATCH_BALANCE } from './balance';
import { createBattlefieldState } from './battlefieldOps';
import type { DuelMatchState, DuelistState } from './types';

const DEFAULT_ENDPOINTS = createDefaultEdgeEndpoints();

export const DEFAULT_ENTRANCE: GridPoint = DEFAULT_ENDPOINTS.entrance;
export const DEFAULT_EXIT: GridPoint = DEFAULT_ENDPOINTS.exit;

export type BattlefieldInitParams = {
  entrance?: GridPoint;
  exit?: GridPoint;
  /** Roster of the shared baseline wave; defaults to the player's race. */
  baselineRaceId?: RaceId;
};

function createDuelistState(raceId: RaceId, grid: GridModel, routes: WaveRoutes): DuelistState {
  return {
    hp: DUEL_MATCH_BALANCE.startingHp,
    gold: DUEL_MATCH_BALANCE.startingGold,
    income: DUEL_MATCH_BALANCE.startingIncome,
    raceId,
    sendQueue: [],
    battlefield: createBattlefieldState(grid, routes),
    lifeStealRemainder: 0,
  };
}

export function createInitialDuelMatchState(
  playerRaceId: RaceId,
  opponentRaceId: RaceId,
  params?: BattlefieldInitParams,
): DuelMatchState {
  const entrance = params?.entrance ?? DEFAULT_ENTRANCE;
  const exit = params?.exit ?? DEFAULT_EXIT;

  const playerGrid = createGridModel({ entrance, exit });
  const opponentGrid = createGridModel({ entrance, exit });

  const playerRoutes = calculateWaveRoutes(playerGrid);
  const opponentRoutes = calculateWaveRoutes(opponentGrid);

  return {
    round: 0,
    phase: 'build',
    player: createDuelistState(playerRaceId, playerGrid, playerRoutes),
    opponent: createDuelistState(opponentRaceId, opponentGrid, opponentRoutes),
    baselineWaveId: '',
    baselineRaceId: params?.baselineRaceId ?? playerRaceId,
  };
}
