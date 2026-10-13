import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../shared/constants/footprint';
import type { UnitSizeClass } from '../../../shared/types/content-ids';
import type { GridPoint } from '../../../shared/types/grid';
import type { CreepEntity } from './types';

type PositionedCreep = Pick<CreepEntity, 'position' | 'sizeClass'>;

/**
 * Cells from the creep's anchor (top-left) cell to the centre of its footprint,
 * on both axes: 0 for single-cell creeps, 0.5 for a 2x2 creep.
 */
export function getCreepFootprintCenterOffsetInCells(sizeClass: UnitSizeClass): number {
  return (CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[sizeClass] - 1) / 2;
}

/**
 * Centre of the creep's footprint in cell coordinates (same convention as
 * `getTowerCenter`). Range, splash and chain distances are measured from here.
 */
export function getCreepFootprintCenter(creep: PositionedCreep): GridPoint {
  const offset = getCreepFootprintCenterOffsetInCells(creep.sizeClass);
  return { x: creep.position.x + offset, y: creep.position.y + offset };
}
