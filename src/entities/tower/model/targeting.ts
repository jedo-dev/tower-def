import { getCreepFootprintCenterOffsetInCells, isCreepAlive, isCreepHidden } from '../../creep';
import type { CreepEntity } from '../../creep';
import { canTargetScopeHitMoveType, UnitMoveType } from '../../../shared/types/content-ids';
import { getTowerCenter } from './footprint';
import { resolveTowerTargetScope, type TowerEntity, type TowerTargetScopeRef } from './types';

/** Measured between the centres of the tower's and the creep's footprints. */
export function getTowerCreepDistanceInCells(tower: TowerEntity, creep: CreepEntity): number {
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
  tower: TowerTargetScopeRef,
  creep: Pick<CreepEntity, 'moveType'>,
): boolean {
  return canTargetScopeHitMoveType(resolveTowerTargetScope(tower), creep.moveType);
}

/**
 * Whether the tower may shoot this creep right now: alive, not inside its
 * spawn invisibility, inside its target scope, within `range` and not closer
 * than an authored `minRangeCells`.
 */
export function isCreepTargetableByTower(tower: TowerEntity, creep: CreepEntity): boolean {
  if (!isCreepAlive(creep) || isCreepHidden(creep) || !canTowerTargetCreep(tower, creep)) {
    return false;
  }

  const distance = getTowerCreepDistanceInCells(tower, creep);
  const minRange = tower.combatStats.abilities?.minRangeCells ?? 0;

  return distance <= tower.combatStats.range && distance >= minRange;
}

/** Alive creeps in range that the tower is allowed to shoot. */
export function getCreepsInTowerRange(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity[] {
  return creeps.filter((creep) => isCreepTargetableByTower(tower, creep));
}

/** Whether `candidate` outranks `best` under the target priority below. */
function isPreferredTarget(tower: TowerEntity, candidate: CreepEntity, best: CreepEntity): boolean {
  const candidateRemaining = getRemainingDistanceToExit(candidate);
  const bestRemaining = getRemainingDistanceToExit(best);

  if (candidateRemaining < bestRemaining) {
    return true;
  }
  if (candidateRemaining > bestRemaining) {
    return false;
  }

  const candidateFlies = candidate.moveType === UnitMoveType.AIR;
  const bestFlies = best.moveType === UnitMoveType.AIR;
  if (candidateFlies !== bestFlies) {
    return candidateFlies;
  }

  return getTowerCreepDistanceInCells(tower, candidate) < getTowerCreepDistanceInCells(tower, best);
}

/**
 * Target priority (the WispTD rule):
 *   1. the creep closest to its exit, measured along its own route (ground
 *      routes differ by footprint and the air line is shorter than any maze);
 *   2. on a tie, air before ground: a flier past the maze leaks first;
 *   3. then the creep nearest the tower.
 * Creeps the tower's `allowedTargets` scope cannot hit are never considered.
 * One pass, no allocation: towers pick targets every frame. On a full tie the
 * earliest creep in `creeps` wins.
 */
export function selectTowerTarget(
  tower: TowerEntity,
  creeps: readonly CreepEntity[],
): CreepEntity | null {
  let best: CreepEntity | null = null;

  for (let index = 0; index < creeps.length; index += 1) {
    const candidate = creeps[index];
    if (!isCreepTargetableByTower(tower, candidate)) {
      continue;
    }
    if (best === null || isPreferredTarget(tower, candidate, best)) {
      best = candidate;
    }
  }

  return best;
}
