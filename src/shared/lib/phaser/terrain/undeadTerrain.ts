import type { GridPosition } from '../../../types/pathfinding';
import { UndeadTerrainTileIndex } from '../../../constants/terrain';

const UNDEAD_TERRAIN_HASH_SEED = 8717;
const UNDEAD_TERRAIN_DECORATION_BASE_CHANCE_PERCENT = 8;
const UNDEAD_TERRAIN_DECORATION_EDGE_BONUS_PERCENT = 12;

const UNDEAD_BASE_TILES = [
  UndeadTerrainTileIndex.BASE_STONE_A,
  UndeadTerrainTileIndex.BASE_STONE_B,
] as const;

const UNDEAD_DECORATION_TILES = [
  UndeadTerrainTileIndex.SKULL_DECORATION,
  UndeadTerrainTileIndex.GREEN_NECROMANTIC_GLOW,
  UndeadTerrainTileIndex.PURPLE_CORRUPTION,
  UndeadTerrainTileIndex.DARK_CORRUPTION_EDGE,
] as const;

type TerrainCellContext = {
  position: GridPosition;
  entrance: GridPosition;
  exit: GridPosition;
  cols: number;
  rows: number;
};

function hashCellCoordinate(x: number, y: number, salt: number): number {
  const mixed = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  return mixed >>> 0;
}

function isEntranceOrExitCell(
  position: GridPosition,
  entrance: GridPosition,
  exit: GridPosition,
): boolean {
  const isEntrance = position.x === entrance.x && position.y === entrance.y;
  const isExit = position.x === exit.x && position.y === exit.y;
  return isEntrance || isExit;
}

function getEdgeDistance(
  position: GridPosition,
  cols: number,
  rows: number,
): number {
  const distanceFromLeft = position.x;
  const distanceFromRight = cols - 1 - position.x;
  const distanceFromTop = position.y;
  const distanceFromBottom = rows - 1 - position.y;

  return Math.min(
    distanceFromLeft,
    distanceFromRight,
    distanceFromTop,
    distanceFromBottom,
  );
}

export function resolveUndeadTerrainTileIndex(context: TerrainCellContext): number {
  const { position, entrance, exit, cols, rows } = context;
  const baseHash = hashCellCoordinate(position.x, position.y, UNDEAD_TERRAIN_HASH_SEED);

  if (isEntranceOrExitCell(position, entrance, exit)) {
    return UNDEAD_BASE_TILES[baseHash % UNDEAD_BASE_TILES.length];
  }

  const edgeDistance = getEdgeDistance(position, cols, rows);
  const edgeFactor = edgeDistance <= 0 ? 1 : edgeDistance === 1 ? 0.7 : edgeDistance === 2 ? 0.35 : 0;
  const decorationChancePercent =
    UNDEAD_TERRAIN_DECORATION_BASE_CHANCE_PERCENT
    + Math.round(UNDEAD_TERRAIN_DECORATION_EDGE_BONUS_PERCENT * edgeFactor);
  const shouldPlaceDecoration = (baseHash % 100) < decorationChancePercent;

  if (!shouldPlaceDecoration) {
    return UNDEAD_BASE_TILES[baseHash % UNDEAD_BASE_TILES.length];
  }

  const decorationHash = hashCellCoordinate(position.x, position.y, UNDEAD_TERRAIN_HASH_SEED + 17);
  return UNDEAD_DECORATION_TILES[decorationHash % UNDEAD_DECORATION_TILES.length];
}

