import type { RaceId } from '../../../shared/types/content-ids';
import type { GridPoint, GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { createGridModel } from '../../../shared/lib/grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { calculateWaveStartPath } from '../../wave/model/calculateWavePath';
import { DUEL_MATCH_BALANCE } from './balance';
import { createBattlefieldState } from './battlefieldOps';
import type { DuelMatchState, DuelistState } from './types';

const DEFAULT_ENDPOINTS = createDefaultEdgeEndpoints();

export const DEFAULT_ENTRANCE: GridPoint = DEFAULT_ENDPOINTS.entrance;
export const DEFAULT_EXIT: GridPoint = DEFAULT_ENDPOINTS.exit;

export type BattlefieldInitParams = {
  entrance?: GridPoint;
  exit?: GridPoint;
};

function createDuelistState(
  raceId: RaceId,
  grid: GridModel,
  path: GridPosition[],
  startingGold: number,
): DuelistState {
  return {
    hp: DUEL_MATCH_BALANCE.startingHp,
    gold: startingGold,
    income: DUEL_MATCH_BALANCE.startingIncome,
    raceId,
    sendQueue: [],
    battlefield: createBattlefieldState(grid, path),
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

  const playerPath = calculateWaveStartPath(playerGrid);
  const opponentPath = calculateWaveStartPath(opponentGrid);

  return {
    round: 0,
    phase: 'build',
    player: createDuelistState(
      playerRaceId,
      playerGrid,
      playerPath,
      DUEL_MATCH_BALANCE.startingGold,
    ),
    opponent: createDuelistState(
      opponentRaceId,
      opponentGrid,
      opponentPath,
      DUEL_MATCH_BALANCE.opponentStartingGold,
    ),
    baselineWaveId: '',
  };
}
