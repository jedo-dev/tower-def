import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { toPointerGridTarget } from '../grid/gameSceneGridPreviewRuntime';
import {
  computeResponsiveCameraView,
  rebaseScreenPoint,
  screenToWorldPoint,
  worldToScreenPoint,
  type CameraView,
} from './cameraViewMapping';

const CELL = GRID_DIMENSIONS.cellSize;
const WORLD = {
  width: GRID_DIMENSIONS.cols * CELL,
  height: GRID_DIMENSIONS.rows * CELL,
};

/** Canvas pixel at which the camera renders the lower-right quarter of a cell. */
function screenPointInCell(cellX: number, cellY: number, view: CameraView) {
  return worldToScreenPoint({ x: (cellX + 0.75) * CELL, y: (cellY + 0.75) * CELL }, view);
}

describe('computeResponsiveCameraView', () => {
  it('fits the whole board and centres it on the spare axis', () => {
    const view = computeResponsiveCameraView(378, 900, WORLD);
    const topLeft = worldToScreenPoint({ x: 0, y: 0 }, view);
    const bottomRight = worldToScreenPoint({ x: WORLD.width, y: WORLD.height }, view);

    expect(topLeft.x).toBeCloseTo(0);
    expect(bottomRight.x).toBeCloseTo(378);
    // Equal letterbox above and below the board.
    expect(topLeft.y).toBeCloseTo(900 - bottomRight.y);
  });
});

describe('screenToWorldPoint', () => {
  it('inverts the camera transform under zoom, scroll and a viewport offset', () => {
    const view: CameraView = {
      viewportX: 12,
      viewportY: 30,
      viewportWidth: 348,
      viewportHeight: 464.6,
      zoom: 0.968,
      scrollX: -14,
      scrollY: 7.7,
    };
    const world = { x: 123.4, y: 456.7 };

    const roundTrip = screenToWorldPoint(worldToScreenPoint(world, view), view);

    expect(roundTrip.x).toBeCloseTo(world.x);
    expect(roundTrip.y).toBeCloseTo(world.y);
  });

  it('maps a tap to the block under it after the viewport is resized', () => {
    const beforeResize = computeResponsiveCameraView(468, 564.6, WORLD);
    const afterResize = computeResponsiveCameraView(348, 443.8, WORLD);
    const expected = { cell: { x: 9, y: 20 }, buildAnchor: { x: 9, y: 20 } };

    const tapAfterResize = screenPointInCell(9, 20, afterResize);
    const resolved = screenToWorldPoint(tapAfterResize, afterResize);
    expect(toPointerGridTarget(resolved.x, resolved.y)).toEqual(expected);

    // Mapping the same tap through the pre-resize camera lands elsewhere: the
    // camera view used for input must be the one the board is rendered with.
    const stale = screenToWorldPoint(tapAfterResize, beforeResize);
    expect(toPointerGridTarget(stale.x, stale.y)).not.toEqual(expected);
  });
});

describe('rebaseScreenPoint', () => {
  it('corrects a pointer computed against canvas offsets from before the canvas moved', () => {
    const view = computeResponsiveCameraView(378, 508.6, WORLD);
    const tapOnScreen = screenPointInCell(4, 10, view);
    const staleOffset = { left: 116, top: 6 };
    const currentOffset = { left: 6, top: 6 };
    const displayScale = { x: 1, y: 1 };
    // Phaser derived the pointer from the page position minus the stale offset.
    const staleScreen = {
      x: tapOnScreen.x + currentOffset.left - staleOffset.left,
      y: tapOnScreen.y + currentOffset.top - staleOffset.top,
    };

    const rebased = rebaseScreenPoint(staleScreen, staleOffset, currentOffset, displayScale);
    const world = screenToWorldPoint(rebased, view);

    expect(rebased.x).toBeCloseTo(tapOnScreen.x);
    expect(rebased.y).toBeCloseTo(tapOnScreen.y);
    expect(toPointerGridTarget(world.x, world.y)?.buildAnchor).toEqual({ x: 4, y: 10 });
  });

  it('leaves the pointer untouched when the canvas has not moved', () => {
    const offset = { left: 6, top: 6 };

    expect(rebaseScreenPoint({ x: 40, y: 50 }, offset, offset, { x: 1, y: 1 })).toEqual({
      x: 40,
      y: 50,
    });
  });
});
