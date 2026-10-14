import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import type { GridPoint } from '../../../../shared/types/grid';
import { MAZE_PLAN_LANE_WIDTH } from './constants';

// How one wall of tower blocks is laid against the board: where it may start
// and how far it runs. The candidate list itself is in `wallCandidates`.

/** One step of a wall, in blocks: straight (one axis) or diagonal (both). */
export type WallDirection = { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 };

/** What the candidate generator needs to know about the board. */
export type WallSiteView = {
  readonly cols: number;
  readonly rows: number;
  /** Outside the board, or a cell no creep can stand on (a block or rock). */
  isObstacle(x: number, y: number): boolean;
  canPlace(anchor: GridPoint): boolean;
};

const { width: BLOCK_WIDTH, height: BLOCK_HEIGHT } = TOWER_FOOTPRINT;

/** How a block at some anchor sits against the obstacles around it. */
type BlockFit = {
  /** A gap of 1..lane-1 cells off a front or side face: a small-creep shortcut or a seal. */
  hasNarrowGap: boolean;
  /** An obstacle right against a front face: the block closes a passage. */
  hasAheadContact: boolean;
};

/** Outward normals of a block's four faces. */
const FACE_NORMALS: readonly GridPoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** The face cells of the block on the side `normal` points to. */
function getFaceCells(anchor: GridPoint, normal: GridPoint): GridPoint[] {
  const cells: GridPoint[] = [];
  for (let offset = 0; offset < BLOCK_WIDTH; offset += 1) {
    const x =
      normal.x === 0 ? anchor.x + offset : normal.x > 0 ? anchor.x + BLOCK_WIDTH - 1 : anchor.x;
    const y =
      normal.y === 0 ? anchor.y + offset : normal.y > 0 ? anchor.y + BLOCK_HEIGHT - 1 : anchor.y;
    cells.push({ x, y });
  }
  return cells;
}

/** Free cells straight out from `cell` before the first obstacle, up to `limit` (then `limit`). */
function countFreeCells(
  view: WallSiteView,
  cell: GridPoint,
  normal: GridPoint,
  limit: number,
): number {
  for (let step = 1; step <= limit; step += 1) {
    if (view.isObstacle(cell.x + normal.x * step, cell.y + normal.y * step)) {
      return step - 1;
    }
  }
  return limit;
}

/**
 * Looks straight out from every face of a block at `anchor` but the back
 * one(s), where the wall comes from. A wall must leave a full lane in front
 * of its tip and no narrower gap beside it.
 */
function measureBlockFit(
  view: WallSiteView,
  direction: WallDirection,
  anchor: GridPoint,
): BlockFit {
  const lane = MAZE_PLAN_LANE_WIDTH;
  const fit: BlockFit = { hasNarrowGap: false, hasAheadContact: false };
  for (const normal of FACE_NORMALS) {
    const isBack =
      (normal.x !== 0 && normal.x === -direction.x) ||
      (normal.y !== 0 && normal.y === -direction.y);
    if (isBack) {
      continue;
    }
    const isFront =
      (normal.x !== 0 && normal.x === direction.x) || (normal.y !== 0 && normal.y === direction.y);
    for (const cell of getFaceCells(anchor, normal)) {
      const free = countFreeCells(view, cell, normal, lane);
      if (free === 0) {
        fit.hasAheadContact ||= isFront;
      } else if (free < lane) {
        fit.hasNarrowGap = true;
      }
    }
  }
  return fit;
}

/** An obstacle touches the block's back face (or back corner, for a diagonal). */
export function isAttached(
  view: WallSiteView,
  direction: WallDirection,
  anchor: GridPoint,
): boolean {
  const backX = direction.x === 1 ? anchor.x - 1 : anchor.x + BLOCK_WIDTH;
  const backY = direction.y === 1 ? anchor.y - 1 : anchor.y + BLOCK_HEIGHT;
  if (direction.x !== 0 && direction.y !== 0) {
    // Corner to corner only: a diagonal flush against a face is that corner one shifted.
    return view.isObstacle(backX, backY);
  }
  for (let offset = 0; offset < BLOCK_WIDTH; offset += 1) {
    const isBackCellBlocked =
      direction.x !== 0
        ? view.isObstacle(backX, anchor.y + offset)
        : view.isObstacle(anchor.x + offset, backY);
    if (isBackCellBlocked) {
      return true;
    }
  }
  return false;
}

/**
 * The chain from `start` up to the last block that still leaves a lane, and
 * the block after it when that one would instead close the passage exactly
 * (touch the obstacle ahead, no narrow gap): the closing variant.
 */
export function buildChain(
  view: WallSiteView,
  direction: WallDirection,
  start: GridPoint,
): { anchors: GridPoint[]; closing: GridPoint | null } {
  const anchors: GridPoint[] = [];
  let anchor = start;
  while (view.canPlace(anchor)) {
    const fit = measureBlockFit(view, direction, anchor);
    if (fit.hasNarrowGap) {
      break;
    }
    if (fit.hasAheadContact) {
      return { anchors, closing: anchor };
    }
    anchors.push(anchor);
    anchor = {
      x: anchor.x + direction.x * BLOCK_WIDTH,
      y: anchor.y + direction.y * BLOCK_HEIGHT,
    };
  }
  return { anchors, closing: null };
}

/** Whether a straight wall's block at `anchor` still leaves a lane before the far edge. */
function isShortOfFarEdge(
  view: WallSiteView,
  direction: WallDirection,
  anchor: GridPoint,
): boolean {
  const lane = MAZE_PLAN_LANE_WIDTH;
  if (direction.x !== 0) {
    return direction.x > 0 ? anchor.x + BLOCK_WIDTH + lane <= view.cols : anchor.x >= lane;
  }
  return direction.y > 0 ? anchor.y + BLOCK_HEIGHT + lane <= view.rows : anchor.y >= lane;
}

/**
 * A straight wall from a board edge across the whole line to a lane at the far
 * edge, stepping over whatever is in the way (no block where it cannot build).
 * Empty unless `start` lies on the edge the wall runs from. One such line can
 * close several gaps in a row at once, which no single gap-closing wall pays
 * for on its own.
 */
export function buildEdgeLine(
  view: WallSiteView,
  direction: WallDirection,
  start: GridPoint,
): GridPoint[] {
  const isOnEdge =
    (direction.x === 1 && start.x === 0) ||
    (direction.x === -1 && start.x === view.cols - BLOCK_WIDTH) ||
    (direction.y === 1 && start.y === 0) ||
    (direction.y === -1 && start.y === view.rows - BLOCK_HEIGHT);
  const anchors: GridPoint[] = [];
  if (!isOnEdge || (direction.x !== 0 && direction.y !== 0)) {
    return anchors;
  }
  let anchor = start;
  while (isShortOfFarEdge(view, direction, anchor)) {
    if (view.canPlace(anchor)) {
      anchors.push(anchor);
    }
    anchor = { x: anchor.x + direction.x * BLOCK_WIDTH, y: anchor.y + direction.y * BLOCK_HEIGHT };
  }
  return anchors;
}
