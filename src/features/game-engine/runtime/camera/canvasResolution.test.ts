import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { MAX_CANVAS_PIXEL_RATIO } from '../../scenes/gameScene.constants';
import { toPointerGridTarget } from '../grid/gameSceneGridPreviewRuntime';
import { panCameraView, zoomCameraViewAt } from './boardCameraZoom';
import {
  computeResponsiveCameraView,
  rebaseScreenPoint,
  screenToWorldPoint,
  worldToScreenPoint,
  type CameraView,
  type WorldPoint,
} from './cameraViewMapping';
import {
  computeCanvasResolution,
  isSameCanvasResolution,
  resolveCanvasPixelRatio,
  toBackingCameraView,
  toCssScreenPoint,
} from './canvasResolution';

const CELL = GRID_DIMENSIONS.cellSize;
const WORLD = {
  width: GRID_DIMENSIONS.cols * CELL,
  height: GRID_DIMENSIONS.rows * CELL,
};
const DEVICE_PIXEL_RATIOS = [1, 2, 3] as const;

/** The views a player can leave the board in: fit, zoomed off-centre, zoomed and panned. */
function cssViews(cssWidth: number, cssHeight: number): CameraView[] {
  const fit = computeResponsiveCameraView(cssWidth, cssHeight, WORLD);
  const zoomed = zoomCameraViewAt(fit, { x: 90, y: 600 }, fit.zoom * 2.4, WORLD);
  const panned = panCameraView(zoomed, { x: -70, y: 45 }, WORLD);
  return [fit, zoomed, panned];
}

function cellCentre(cellX: number, cellY: number): WorldPoint {
  return { x: (cellX + 0.5) * CELL, y: (cellY + 0.5) * CELL };
}

describe('resolveCanvasPixelRatio', () => {
  it('renders at the device ratio up to the cap, never below 1x', () => {
    expect(resolveCanvasPixelRatio(1, MAX_CANVAS_PIXEL_RATIO)).toBe(1);
    expect(resolveCanvasPixelRatio(2, MAX_CANVAS_PIXEL_RATIO)).toBe(2);
    expect(resolveCanvasPixelRatio(3, MAX_CANVAS_PIXEL_RATIO)).toBe(MAX_CANVAS_PIXEL_RATIO);
    expect(resolveCanvasPixelRatio(0.8, MAX_CANVAS_PIXEL_RATIO)).toBe(1);
    expect(resolveCanvasPixelRatio(Number.NaN, MAX_CANVAS_PIXEL_RATIO)).toBe(1);
  });
});

describe('computeCanvasResolution', () => {
  it('sizes the backing store to the CSS size times the capped ratio', () => {
    expect(computeCanvasResolution(378, 439.625, 3, 2.5)).toEqual({
      cssWidth: 378,
      cssHeight: 439.625,
      pixelRatio: 2.5,
      backingWidth: 945,
      backingHeight: 1099,
    });
    expect(computeCanvasResolution(348, 396, 2, 2.5)).toMatchObject({
      backingWidth: 696,
      backingHeight: 792,
    });
  });

  it('keeps a hidden (zero-size) host at a 1x1 backing store', () => {
    expect(computeCanvasResolution(0, 0, 3, 2.5)).toMatchObject({
      backingWidth: 3,
      backingHeight: 3,
    });
    expect(computeCanvasResolution(0, 0, 1, 2.5)).toMatchObject({
      backingWidth: 1,
      backingHeight: 1,
    });
  });

  it('compares resolutions field by field', () => {
    const resolution = computeCanvasResolution(378, 439, 3, 2.5);
    expect(isSameCanvasResolution(resolution, { ...resolution })).toBe(true);
    expect(isSameCanvasResolution(resolution, computeCanvasResolution(378, 439, 2, 2.5))).toBe(
      false,
    );
  });
});

describe('toBackingCameraView', () => {
  it.each(DEVICE_PIXEL_RATIOS)(
    'renders every world point at DPR %i times its CSS-pixel position',
    (pixelRatio) => {
      for (const view of cssViews(378, 439)) {
        const backing = toBackingCameraView(view, pixelRatio);
        for (const world of [cellCentre(0, 0), cellCentre(7, 13), cellCentre(19, 29)]) {
          const css = worldToScreenPoint(world, view);
          const rendered = worldToScreenPoint(world, backing);
          expect(rendered.x).toBeCloseTo(css.x * pixelRatio, 6);
          expect(rendered.y).toBeCloseTo(css.y * pixelRatio, 6);
        }
      }
    },
  );

  it('is the identity at DPR 1', () => {
    for (const view of cssViews(360, 800)) {
      expect(toBackingCameraView(view, 1)).toEqual(view);
    }
  });
});

describe('pointer -> cell mapping at device pixel ratios', () => {
  it.each(DEVICE_PIXEL_RATIOS)('maps a tap to the cell drawn under it at DPR %i', (pixelRatio) => {
    for (const view of cssViews(360, 800)) {
      const backingView = toBackingCameraView(view, pixelRatio);
      for (const [cellX, cellY] of [
        [0, 0],
        [8, 14],
        [19, 29],
      ] as const) {
        // Where the cell is drawn on the backing store is where Phaser reports
        // the pointer (CSS offset x displayScale) when the finger is on it.
        const pointer = worldToScreenPoint(cellCentre(cellX, cellY), backingView);
        const css = toCssScreenPoint(pointer, { x: pixelRatio, y: pixelRatio });
        const world = screenToWorldPoint(css, view);
        expect(toPointerGridTarget(world.x, world.y)?.cell).toEqual({ x: cellX, y: cellY });
      }
    }
  });

  it.each(DEVICE_PIXEL_RATIOS)(
    're-bases a stale canvas offset in backing pixels at DPR %i',
    (pixelRatio) => {
      const displayScale = { x: pixelRatio, y: pixelRatio };
      // Phaser measured the canvas 30 CSS px lower than it now is.
      const truePointerCss = { x: 120, y: 200 };
      const stalePointer = { x: 120 * pixelRatio, y: (200 - 30) * pixelRatio };
      const rebased = rebaseScreenPoint(
        stalePointer,
        { left: 0, top: 130 },
        { left: 0, top: 100 },
        displayScale,
      );
      expect(toCssScreenPoint(rebased, displayScale)).toEqual(truePointerCss);
    },
  );

  it('maps 1:1 while the canvas is not laid out (degenerate display scale)', () => {
    expect(toCssScreenPoint({ x: 40, y: 50 }, { x: Number.POSITIVE_INFINITY, y: 0 })).toEqual({
      x: 40,
      y: 50,
    });
  });
});
