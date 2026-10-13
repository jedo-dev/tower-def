import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import { canPlaceFootprint } from '../../../../shared/lib/pathfinding/validateFootprintPlacement';
import type { GridPoint } from '../../../../shared/types/grid';
import { selectPlanBuilds } from './selectPlanBuilds';

/** Straight down the middle column pair, so walls across rows pay off. */
const GRID = createGridModel({ entrance: { x: 9, y: 0 }, exit: { x: 9, y: 28 } });

/** A wall along row 10 from the left edge, edge-first like the planner lists it. */
const WALL: GridPoint[] = Array.from({ length: 9 }, (_, index) => ({ x: index * 2, y: 10 }));

describe('computer-opponent/maze-planning/selectPlanBuilds', () => {
  it('builds what pays now first, then falls back to plan order', () => {
    const { anchors, gains } = selectPlanBuilds({ grid: GRID, candidates: WALL, maxBuilds: 3 });

    // The edge blocks lengthen nothing yet; the blocks across the route do.
    expect(gains[0]).toBeGreaterThan(0);
    expect(anchors[0]).not.toEqual(WALL[0]);
    expect(anchors).toHaveLength(3);
  });

  it('never picks a block that seals a route', () => {
    let grid = GRID;
    // Wall the row off except the last two blocks: only one of them may stand.
    for (const anchor of WALL.slice(0, 8)) {
      grid = withFootprintOccupancy(grid, anchor, TOWER_FOOTPRINT, true);
    }
    const lastTwo = [WALL[8], { x: 18, y: 10 }];
    const { anchors } = selectPlanBuilds({ grid, candidates: lastTwo, maxBuilds: 2 });

    expect(anchors).toHaveLength(1);
    expect(canPlaceFootprint(grid, anchors[0], TOWER_FOOTPRINT)).toBe(true);
  });

  it('keeps every pick legal for both size classes, one after another', () => {
    const { anchors } = selectPlanBuilds({ grid: GRID, candidates: WALL, maxBuilds: 9 });
    let grid = GRID;

    for (const anchor of anchors) {
      expect(canPlaceFootprint(grid, anchor, TOWER_FOOTPRINT)).toBe(true);
      grid = withFootprintOccupancy(grid, anchor, TOWER_FOOTPRINT, true);
    }
    expect(anchors.length).toBeGreaterThanOrEqual(8);
  });

  it('respects the build count', () => {
    expect(selectPlanBuilds({ grid: GRID, candidates: WALL, maxBuilds: 0 }).anchors).toEqual([]);
  });
});
