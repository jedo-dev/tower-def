import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';

export type MazeSkeleton = {
  /** Wall cells in the order they should be filled. */
  readonly cells: readonly GridPosition[];
  /** 0 for the most urgent cell, null when the cell is not part of the plan. */
  rankOf(position: GridPosition): number | null;
  /** 1 for the most urgent cell, 0 for off-plan cells. */
  priorityOf(position: GridPosition): number;
};

/** Free lane between two walls. One keeps the maze tight without sealing it. */
const LANE_WIDTH = 1;
/**
 * Cells kept clear along the travel axis next to the entrance and the exit, so
 * creeps always have a lane to enter and leave by.
 */
const ENDPOINT_MARGIN = 1;

const EMPTY_SKELETON: MazeSkeleton = {
  cells: [],
  rankOf: () => null,
  priorityOf: () => 0,
};

function toKey(position: GridPosition): string {
  return `${position.x}:${position.y}`;
}

/**
 * Comb of walls the opponent aims to build: parallel teeth across the travel
 * axis, each anchored to one edge with its gap on the opposite one, so creeps
 * have to weave the full width of the field between every pair of teeth.
 *
 * A purely greedy "which single cell lengthens the path most" search cannot
 * find this shape: the first cells of a tooth add almost nothing, so greed
 * settles for scattered blobs. Committing to the comb up front and filling it
 * tooth by tooth turns every tower into real detour length.
 */
export function createMazeSkeleton(grid: GridModel): MazeSkeleton {
  const { cols, rows, entrance, exit } = grid;

  if (cols <= 0 || rows <= 0) {
    return EMPTY_SKELETON;
  }

  const travelsHorizontally = Math.abs(exit.x - entrance.x) >= Math.abs(exit.y - entrance.y);

  // Along = axis the creeps travel, across = axis each tooth spans.
  const alongSize = travelsHorizontally ? cols : rows;
  const acrossSize = travelsHorizontally ? rows : cols;
  const entranceAlong = travelsHorizontally ? entrance.x : entrance.y;
  const exitAlong = travelsHorizontally ? exit.x : exit.y;

  const firstTooth = Math.min(entranceAlong, exitAlong) + ENDPOINT_MARGIN;
  const lastTooth = Math.max(entranceAlong, exitAlong) - ENDPOINT_MARGIN;
  if (acrossSize < 3 || firstTooth > lastTooth || alongSize < 5) {
    return EMPTY_SKELETON;
  }

  const blockedKeys = new Set<string>();
  for (const cell of grid.cells) {
    if (!cell.isWalkable || cell.role !== 'empty') {
      blockedKeys.add(toKey(cell));
    }
  }

  const cells: GridPosition[] = [];
  let toothIndex = 0;

  for (let along = firstTooth; along <= lastTooth; along += LANE_WIDTH + 1) {
    // Teeth alternate which edge they leave open, which is what forces the
    // weave; anchoring starts at the closed edge so a half-built tooth already
    // makes creeps walk around it.
    const gapAtEnd = toothIndex % 2 === 1;
    const anchor = gapAtEnd ? 0 : acrossSize - 1;
    const step = gapAtEnd ? 1 : -1;

    for (let index = 0; index < acrossSize - 1; index += 1) {
      const across = anchor + step * index;
      const position: GridPosition = travelsHorizontally
        ? { x: along, y: across }
        : { x: across, y: along };

      if (blockedKeys.has(toKey(position))) {
        continue;
      }

      cells.push(position);
    }

    toothIndex += 1;
  }

  const rankByKey = new Map<string, number>();
  cells.forEach((cell, index) => {
    rankByKey.set(toKey(cell), index);
  });

  return {
    cells,
    rankOf(position: GridPosition): number | null {
      return rankByKey.get(toKey(position)) ?? null;
    },
    priorityOf(position: GridPosition): number {
      const rank = rankByKey.get(toKey(position));
      if (rank === undefined) {
        return 0;
      }
      return (cells.length - rank) / cells.length;
    },
  };
}
