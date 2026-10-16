import { getCreepFootprintCenterOffsetInCells, type CreepEntity } from '../../../../entities/creep';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import type { CellCenterWriter, PixelPoint } from './towerCombatTypes';

type PositionedCreep = Pick<CreepEntity, 'position' | 'sizeClass'>;

/** Footprint centre in cells, reused by every call (callers read it synchronously). */
const footprintCenterCell: GridPosition = { x: 0, y: 0 };

/**
 * Allocation-free `toCellCenter(getCreepFootprintCenter(creep))`: writes the
 * pixel centre of the creep's footprint into `out`, with the same arithmetic.
 */
export function writeCreepFootprintCenterPx(
  hooks: { writeCellCenter: CellCenterWriter },
  creep: PositionedCreep,
  out: PixelPoint,
): void {
  const offset = getCreepFootprintCenterOffsetInCells(creep.sizeClass);
  footprintCenterCell.x = creep.position.x + offset;
  footprintCenterCell.y = creep.position.y + offset;
  hooks.writeCellCenter(footprintCenterCell, out);
}
