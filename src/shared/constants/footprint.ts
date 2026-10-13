import type { Footprint } from '../types/grid';
import { UnitSizeClass } from '../types/content-ids';

/** Edge length, in cells, of every tower's square footprint. */
export enum TowerFootprint {
  SIZE = 2,
}

/**
 * Edge length, in cells, of the square footprint a creep needs to pass, by its
 * authored size class. Medium creatures share the single-cell footprint.
 */
export const CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS: Readonly<Record<UnitSizeClass, number>> = {
  [UnitSizeClass.SMALL]: 1,
  [UnitSizeClass.MEDIUM]: 1,
  [UnitSizeClass.LARGE]: 2,
};

function squareFootprint(size: number): Readonly<Footprint> {
  return { width: size, height: size };
}

export const SINGLE_CELL_FOOTPRINT: Readonly<Footprint> = squareFootprint(1);

/** Every tower covers this many cells, anchored at its top-left cell. */
export const TOWER_FOOTPRINT: Readonly<Footprint> = squareFootprint(TowerFootprint.SIZE);

export const CREEP_FOOTPRINT_BY_SIZE_CLASS: Readonly<Record<UnitSizeClass, Readonly<Footprint>>> = {
  [UnitSizeClass.SMALL]: squareFootprint(CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.SMALL]),
  [UnitSizeClass.MEDIUM]: squareFootprint(CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.MEDIUM]),
  [UnitSizeClass.LARGE]: squareFootprint(CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE]),
};
