/**
 * Pure placement of the painted side-scenery strips that frame the board
 * (tower-def-jsl). Positions are board world space with the image origin at
 * its centre (Phaser's default), so no origin change is needed.
 */

export type SideSceneryBoardSize = {
  /** Board width in world px (cols x cell size). */
  readonly width: number;
  /** Board height in world px (rows x cell size). */
  readonly height: number;
};

export type SideSceneryTextureSize = {
  readonly width: number;
  readonly height: number;
};

export type SideSceneryStripPlacement = {
  /** Centre of the strip in board world space. */
  readonly x: number;
  readonly y: number;
  /** Uniform scale from texture pixels to world px. */
  readonly scale: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
};

/**
 * World px each strip tucks under the grid. The strips sit below the ground
 * tiles, so the overlap is hidden, and it keeps a hairline of background from
 * showing between strip and grid when the camera zoom is fractional.
 */
export const SIDE_SCENERY_GRID_OVERLAP_WORLD_PX = 1;

/** Scale that makes a strip as tall as the board; 0 for an unknown texture size. */
export function resolveSideSceneryScale(
  board: SideSceneryBoardSize,
  texture: SideSceneryTextureSize,
): number {
  if (texture.width <= 0 || texture.height <= 0) {
    return 0;
  }
  return board.height / texture.height;
}

function placeStrip(
  innerEdgeX: number,
  direction: -1 | 1,
  board: SideSceneryBoardSize,
  texture: SideSceneryTextureSize,
): SideSceneryStripPlacement {
  const scale = resolveSideSceneryScale(board, texture);
  const displayWidth = texture.width * scale;
  const displayHeight = texture.height * scale;
  return {
    x: innerEdgeX + direction * (displayWidth / 2),
    y: displayHeight / 2,
    scale,
    displayWidth,
    displayHeight,
  };
}

/** Left strip: its right (inner) edge on the grid's left edge, top-aligned. */
export function computeLeftSideSceneryPlacement(
  board: SideSceneryBoardSize,
  texture: SideSceneryTextureSize,
  overlap: number = SIDE_SCENERY_GRID_OVERLAP_WORLD_PX,
): SideSceneryStripPlacement {
  return placeStrip(overlap, -1, board, texture);
}

/** Right strip: its left (inner) edge on the grid's right edge, top-aligned. */
export function computeRightSideSceneryPlacement(
  board: SideSceneryBoardSize,
  texture: SideSceneryTextureSize,
  overlap: number = SIDE_SCENERY_GRID_OVERLAP_WORLD_PX,
): SideSceneryStripPlacement {
  return placeStrip(board.width - overlap, 1, board, texture);
}
