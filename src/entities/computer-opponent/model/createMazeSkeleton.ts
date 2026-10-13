import {
  CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS,
  TOWER_FOOTPRINT,
} from '../../../shared/constants/footprint';
import { canOccupyFootprint } from '../../../shared/lib/grid/footprint';
import { UnitSizeClass } from '../../../shared/types/content-ids';
import type { GridModel } from '../../../shared/types/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';

export type MazeSkeleton = {
  /**
   * Top-left anchors of the 2x2 tower blocks still to build, in the order
   * they should be filled. Blocks never overlap each other.
   */
  readonly anchors: readonly GridPosition[];
  /** 0 for the most urgent block, null when the anchor is not part of the plan. */
  rankOf(anchor: GridPosition): number | null;
  /** 1 for the most urgent block, 0 for off-plan anchors. */
  priorityOf(anchor: GridPosition): number;
};

/**
 * Free lane between two teeth and the gap each tooth leaves open: wide enough
 * for the largest creeps, so the comb never seals them out.
 */
const LANE_WIDTH = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE];
/**
 * Cells kept clear along the travel axis next to the entrance and the exit, so
 * creeps always have a lane to enter and leave by.
 */
const ENDPOINT_MARGIN = 1;

const EMPTY_SKELETON: MazeSkeleton = {
  anchors: [],
  rankOf: () => null,
  priorityOf: () => 0,
};

function toKey(position: GridPosition): string {
  return `${position.x}:${position.y}`;
}

type CombAxes = {
  travelsHorizontally: boolean;
  /** Size of the field across the travel axis. */
  acrossSize: number;
  /** Size of one tower block along the travel axis and across it. */
  towerAlong: number;
  towerAcross: number;
};

function resolveCombAxes(grid: GridModel): CombAxes {
  const { entrance, exit } = grid;
  const travelsHorizontally = Math.abs(exit.x - entrance.x) >= Math.abs(exit.y - entrance.y);

  return {
    travelsHorizontally,
    acrossSize: travelsHorizontally ? grid.rows : grid.cols,
    towerAlong: travelsHorizontally ? TOWER_FOOTPRINT.width : TOWER_FOOTPRINT.height,
    towerAcross: travelsHorizontally ? TOWER_FOOTPRINT.height : TOWER_FOOTPRINT.width,
  };
}

/** Across-axis offsets of one tooth's blocks, from its closed edge towards its gap. */
function getToothAcrossOffsets(axes: CombAxes, closedAtStart: boolean): number[] {
  const offsets: number[] = [];

  if (closedAtStart) {
    for (let across = 0; across + axes.towerAcross <= axes.acrossSize - LANE_WIDTH;) {
      offsets.push(across);
      across += axes.towerAcross;
    }
    return offsets;
  }

  for (let across = axes.acrossSize - axes.towerAcross; across >= LANE_WIDTH;) {
    offsets.push(across);
    across -= axes.towerAcross;
  }
  return offsets;
}

/**
 * Comb of walls the opponent aims to build: parallel teeth of 2x2 tower blocks
 * across the travel axis, each anchored to one edge with its gap on the
 * opposite one, so creeps have to weave the full width of the field between
 * every pair of teeth.
 *
 * A purely greedy "which single block lengthens the path most" search cannot
 * find this shape: the first blocks of a tooth add almost nothing, so greed
 * settles for scattered blobs. Committing to the comb up front and filling it
 * tooth by tooth turns every tower into real detour length.
 */
export function createMazeSkeleton(grid: GridModel): MazeSkeleton {
  if (grid.cols <= 0 || grid.rows <= 0) {
    return EMPTY_SKELETON;
  }

  const { entrance, exit } = grid;
  const axes = resolveCombAxes(grid);
  const entranceAlong = axes.travelsHorizontally ? entrance.x : entrance.y;
  const exitAlong = axes.travelsHorizontally ? exit.x : exit.y;

  // Zones are anchored at their top-left cell, so the zone nearer the origin
  // extends further along the axis than its anchor.
  const zoneAlongSize = axes.travelsHorizontally
    ? grid.endpointZoneFootprint.width
    : grid.endpointZoneFootprint.height;
  const zoneAcrossSize = axes.travelsHorizontally
    ? grid.endpointZoneFootprint.height
    : grid.endpointZoneFootprint.width;
  const firstTooth = Math.min(entranceAlong, exitAlong) + zoneAlongSize - 1 + ENDPOINT_MARGIN;
  const lastTooth = Math.max(entranceAlong, exitAlong) - ENDPOINT_MARGIN - (axes.towerAlong - 1);
  if (axes.acrossSize < axes.towerAcross + LANE_WIDTH || firstTooth > lastTooth) {
    return EMPTY_SKELETON;
  }

  // The first tooth is closed on the side the creeps arrive from, so even a
  // half-built tooth sits across their straight line.
  const firstEndpoint = entranceAlong <= exitAlong ? entrance : exit;
  const firstEndpointAcrossCenter =
    (axes.travelsHorizontally ? firstEndpoint.y : firstEndpoint.x) + zoneAcrossSize / 2;
  const firstToothClosedAtStart = firstEndpointAcrossCenter < axes.acrossSize / 2;

  const anchors: GridPosition[] = [];
  let toothIndex = 0;

  for (let along = firstTooth; along <= lastTooth; along += axes.towerAlong + LANE_WIDTH) {
    // Teeth alternate which edge they leave open, which is what forces the
    // weave; anchoring starts at the closed edge so a half-built tooth already
    // makes creeps walk around it.
    const closedAtStart = (toothIndex % 2 === 0) === firstToothClosedAtStart;

    for (const across of getToothAcrossOffsets(axes, closedAtStart)) {
      const anchor: GridPosition = axes.travelsHorizontally
        ? { x: along, y: across }
        : { x: across, y: along };

      // Built blocks drop out of the plan; so do blocks over the endpoints.
      if (canOccupyFootprint(grid, anchor, TOWER_FOOTPRINT)) {
        anchors.push(anchor);
      }
    }

    toothIndex += 1;
  }

  const rankByKey = new Map<string, number>();
  anchors.forEach((anchor, index) => {
    rankByKey.set(toKey(anchor), index);
  });

  return {
    anchors,
    rankOf(anchor: GridPosition): number | null {
      return rankByKey.get(toKey(anchor)) ?? null;
    },
    priorityOf(anchor: GridPosition): number {
      const rank = rankByKey.get(toKey(anchor));
      if (rank === undefined) {
        return 0;
      }
      return (anchors.length - rank) / anchors.length;
    },
  };
}
