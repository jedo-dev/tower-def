import type { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import type { TowerEntity } from '../../tower/model/types';
import { TOWER_BASE_LEVEL } from '../../tower/model/types';
import { resolveTowerPlacementStats } from '../../tower/model/placementStats';
import { getRaceTowerConfig } from './buildSpendBudget';

/**
 * A tower the computer places (or plans to place) at level 1. It carries the
 * race's authored tower id, target scope and stats, so the field it fights
 * on and the planner's ledgers use the same numbers and lanes the content
 * gives that race (`allowedTargets`, per-race stats), the way a player-built
 * tower does.
 */
export function createComputerTowerEntity(
  id: string,
  towerType: TowerTypeId,
  position: GridPosition,
  cost: number,
  raceId: RaceId,
): TowerEntity {
  const authored = getRaceTowerConfig(towerType, raceId);
  return {
    id,
    position: { x: position.x, y: position.y },
    cost,
    type: towerType,
    level: TOWER_BASE_LEVEL,
    combatStats: resolveTowerPlacementStats(towerType, authored),
    ...(authored ? { buildableTowerId: authored.id, allowedTargets: authored.allowedTargets } : {}),
  };
}
