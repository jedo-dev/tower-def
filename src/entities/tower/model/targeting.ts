import { getCreepFootprintCenterOffsetInCells, isCreepAlive } from '../../creep';
import type { CreepEntity } from '../../creep';
import { canTargetScopeHitMoveType, UnitMoveType } from '../../../shared/types/content-ids';
import { getTowerCenter } from './footprint';
import { resolveTowerTargetScope, type TowerEntity } from './types';

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

/** Whether the tower's target scope (`allowedTargets`) lets it shoot this creep. */
export function canTowerTargetCreep(
  tower: Pick<TowerEntity, 'type' | 'allowedTargets'>,
  creep: Pick<CreepEntity, 'moveType'>,
): boolean {
  return canTargetScopeHitMoveType(resolveTowerTargetScope(tower), creep.moveType);
}

/** Alive creeps in range that the tower is allowed to shoot. */
export function getCreepsInTowerRange(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity[] {
  return creeps.filter((creep) => {
    if (!isCreepAlive(creep) || !canTowerTargetCreep(tower, creep)) {
      return false;
    }

    return getDistanceInCells(tower, creep) <= tower.combatStats.range;
  });
}

/**
 * Target priority (the WispTD rule):
 *   1. the creep closest to its exit, measured along its own route (ground
 *      routes differ by footprint and the air line is shorter than any maze);
 *   2. on a tie, air before ground: a flier past the maze leaks first;
 *   3. then the creep nearest the tower.
 * Creeps the tower's `allowedTargets` scope cannot hit are never considered.
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

    const candidateFlies = candidate.moveType === UnitMoveType.AIR;
    const bestFlies = best.moveType === UnitMoveType.AIR;
    if (candidateFlies !== bestFlies) {
      return candidateFlies ? candidate : best;
    }

    const bestDistance = getDistanceInCells(tower, best);
    const candidateDistance = getDistanceInCells(tower, candidate);
    return candidateDistance < bestDistance ? candidate : best;
  });
}
