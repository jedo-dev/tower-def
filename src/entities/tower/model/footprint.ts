import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { getFootprintCenter, isCellInFootprint } from '../../../shared/lib/grid/footprint';
import type { GridPoint } from '../../../shared/types/grid';
import type { TowerEntity } from './types';

type PositionedTower = Pick<TowerEntity, 'position'>;

/**
 * Centre of the tower's footprint in cell coordinates. Range, targeting and
 * auras are measured from here, never from the anchor cell.
 */
export function getTowerCenter(tower: PositionedTower): GridPoint {
  return getFootprintCenter(tower.position, TOWER_FOOTPRINT);
}

/** True when `cell` is one of the cells the tower stands on. */
export function isTowerCoveringCell(tower: PositionedTower, cell: GridPoint): boolean {
  return isCellInFootprint(cell, tower.position, TOWER_FOOTPRINT);
}
