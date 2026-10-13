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

export function getCreepsInTowerRange(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity[] {
  return creeps.filter((creep) => {
    if (!isCreepAlive(creep)) {
      return false;
    }

    return getDistanceInCells(tower, creep) <= tower.combatStats.range;
  });
}

export function selectTowerTarget(tower: TowerEntity, creeps: CreepEntity[]): CreepEntity | null {
  const creepsInRange = getCreepsInTowerRange(tower, creeps);

  if (creepsInRange.length === 0) {
    return null;
  }

  return creepsInRange.reduce((best, candidate) => {
    if (candidate.pathIndex > best.pathIndex) {
      return candidate;
    }

    if (candidate.pathIndex < best.pathIndex) {
      return best;
    }

    const bestDistance = getDistanceInCells(tower, best);
    const candidateDistance = getDistanceInCells(tower, candidate);
    return candidateDistance < bestDistance ? candidate : best;
  });
}
