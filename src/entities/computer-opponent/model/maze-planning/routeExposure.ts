import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { getCellAt } from '../../../../shared/lib/grid/getCellAt';
import type { GridModel, GridPoint } from '../../../../shared/types/grid';
import { SMALL_ROUTE_AGENT_SIZE } from '../maze-evaluation/constants';

/**
 * Route samples within `range` of each tower block, summed over the blocks:
 * how many cells of the route each block gets to shoot at, so a route passing
 * a block twice counts twice. Every plan block becomes a tower, so this is
 * the damage a maze lets its own walls deal, not just how long it is.
 */
export function countRouteExposure(
  route: readonly GridPoint[],
  blocks: readonly GridPoint[],
  range: number,
): number {
  const rangeSquared = range * range;
  const halfAgent = SMALL_ROUTE_AGENT_SIZE / 2;
  const halfWidth = TOWER_FOOTPRINT.width / 2;
  const halfHeight = TOWER_FOOTPRINT.height / 2;
  let exposure = 0;

  for (const sample of route) {
    const sampleX = sample.x + halfAgent;
    const sampleY = sample.y + halfAgent;
    for (const block of blocks) {
      const deltaX = sampleX - (block.x + halfWidth);
      const deltaY = sampleY - (block.y + halfHeight);
      if (deltaX * deltaX + deltaY * deltaY <= rangeSquared) {
        exposure += 1;
      }
    }
  }

  return exposure;
}

/**
 * Top-left anchors of the tower blocks standing on the grid. Blocks never
 * overlap, so the first occupied cell met in row-major order that no earlier
 * block covers is always some block's top-left cell.
 */
export function collectStandingBlocks(grid: GridModel): GridPoint[] {
  const { width, height } = TOWER_FOOTPRINT;
  const claimed = new Uint8Array(Math.max(0, grid.cols * grid.rows));
  const blocks: GridPoint[] = [];

  for (let y = 0; y < grid.rows; y += 1) {
    for (let x = 0; x < grid.cols; x += 1) {
      if (claimed[y * grid.cols + x] === 1 || !getCellAt(grid, x, y)?.isOccupied) {
        continue;
      }
      blocks.push({ x, y });
      for (let blockY = y; blockY < Math.min(grid.rows, y + height); blockY += 1) {
        for (let blockX = x; blockX < Math.min(grid.cols, x + width); blockX += 1) {
          claimed[blockY * grid.cols + blockX] = 1;
        }
      }
    }
  }

  return blocks;
}
