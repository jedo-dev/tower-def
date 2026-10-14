import { describe, expect, it } from 'vitest';
import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import { withFootprintOccupancy } from '../../../../shared/lib/grid/footprint';
import { generateEdgeEndpoints } from '../../../../shared/lib/grid/generateEdgeEndpoints';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import type { MazePlanSearchEffort } from './constants';
import { getMazeBoardKey, updateMazePlan, type MazePlan } from './mazePlan';

const EFFORT: MazePlanSearchEffort = {
  screenedWallCount: 1_000,
  finalistCount: 3,
  maxExpandedNodes: 1_000_000,
};

function withBlocks(grid: GridModel, anchors: readonly GridPoint[]): GridModel {
  return anchors.reduce(
    (current, anchor) => withFootprintOccupancy(current, anchor, TOWER_FOOTPRINT, true),
    grid,
  );
}

function update(grid: GridModel, plan: MazePlan | null, towerBudget: number) {
  return updateMazePlan({ grid, plan, towerBudget, effort: EFFORT });
}

describe('computer-opponent/maze-planning/mazePlan', () => {
  const grid = createGridModel(generateEdgeEndpoints(5));

  it('creates a plan for a new board and keeps it while it covers the budget', () => {
    const created = update(grid, null, 10);
    const kept = update(grid, created.plan, 10);

    expect(created.reason).toBe('created');
    expect(created.plan.anchors.length).toBeGreaterThanOrEqual(10);
    expect(kept.reason).toBe('kept');
    expect(kept.plan).toBe(created.plan);
    expect(kept.unbuilt).toEqual(created.unbuilt);
  });

  it('drops built blocks from the unbuilt list but keeps them in the plan', () => {
    const { plan } = update(grid, null, 10);
    const built = plan.anchors.slice(0, 3);
    const afterBuilding = update(withBlocks(grid, built), plan, 5);

    expect(afterBuilding.reason).toBe('kept');
    expect(afterBuilding.plan.anchors).toEqual(plan.anchors);
    expect(afterBuilding.unbuilt).toEqual(plan.anchors.slice(3));
  });

  it('extends the plan with new walls when the budget outgrows it', () => {
    const { plan } = update(grid, null, 10);
    const extended = update(grid, plan, plan.anchors.length + 10);

    expect(extended.reason).toBe('extended');
    expect(extended.plan.anchors.slice(0, plan.anchors.length)).toEqual(plan.anchors);
    expect(extended.plan.anchors.length).toBeGreaterThan(plan.anchors.length);
  });

  it('replans when a planned block no longer fits the board', () => {
    const { plan } = update(grid, null, 10);
    const target = plan.anchors[plan.anchors.length - 1];
    // A foreign tower half over the planned block.
    const blocked = withBlocks(grid, [{ x: target.x + 1, y: target.y }]);
    const replanned = update(blocked, plan, 10);

    expect(replanned.reason).toBe('replanned');
    expect(replanned.plan.anchors).not.toContainEqual(target);
  });

  it('replans for a different board', () => {
    const { plan } = update(grid, null, 10);
    const otherGrid = createGridModel(generateEdgeEndpoints(2));
    const replanned = update(otherGrid, plan, 10);

    expect(replanned.reason).toBe('replanned');
    expect(replanned.plan.boardKey).toBe(getMazeBoardKey(otherGrid));
  });

  it('stops searching once a plan is complete', () => {
    const big = update(grid, null, 500);
    const finished = update(withBlocks(grid, big.plan.anchors), big.plan, 500);
    const again = update(withBlocks(grid, big.plan.anchors), finished.plan, 500);

    expect(finished.plan.isComplete).toBe(true);
    expect(again.reason).toBe('kept');
    expect(again.expandedNodeCount).toBeLessThan(finished.expandedNodeCount);
  });
});
