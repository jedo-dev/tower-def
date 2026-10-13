import { getCreepFootprintCenterOffsetInCells, isCreepAlive } from '../../creep';
import type { CreepEntity } from '../../creep';
import { getTowerCenter } from './footprint';
import type { TowerEntity } from './types';

/** Measured between the centres of the tower's and the creep's footprints. */
function getDistanceInCells(tower: TowerEntity, creep: CreepEntity): number {
  const center = getTowerCenter(tower);
  const creepCenterOffset = getCreepFootprintCenterOffsetInCells(creep.sizeClass);
  const dx = creep.position.x + creepCenterOffset - center.x;
  const dy = creep.position.y + creepCenterOffset - center.y;
  return Math.hypot(dx, dy);
}

/** A creep not yet placed on a route counts as furthest from the exit. */
function getRemainingDistanceToExit(creep: CreepEntity): number {
  return creep.remainingRouteDistance ?? Number.POSITIVE_INFINITY;
}

export function getCreepsInTowerRange(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity[] {
  return creeps.filter((creep) => {
    if (!isCreepAlive(creep)) {
      return false;
    }

    return getDistanceInCells(tower, creep) <= tower.combatStats.range;
  });
}

/**
 * Targets the creep in range closest to its exit, measured along each creep's
 * own route (small and large creeps can walk routes of different lengths).
 * Ties go to the creep nearest the tower.
 */
export function selectTowerTarget(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity | null {
  const creepsInRange = getCreepsInTowerRange(tower, creeps);

  if (creepsInRange.length === 0) {
    return null;
  }

  return creepsInRange.reduce((best, candidate) => {
    const candidateRemaining = getRemainingDistanceToExit(candidate);
    const bestRemaining = getRemainingDistanceToExit(best);

    if (candidateRemaining < bestRemaining) {
      return candidate;
    }

    if (candidateRemaining > bestRemaining) {
      return best;
    }

    const bestDistance = getDistanceInCells(tower, best);
    const candidateDistance = getDistanceInCells(tower, candidate);
    return candidateDistance < bestDistance ? candidate : best;
  });
}
