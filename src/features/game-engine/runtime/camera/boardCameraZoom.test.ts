import { describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import {
  clampCameraScrollToWorld,
  clampZoomFactor,
  isZoomedIn,
  panCameraView,
  refitCameraView,
  resolveZoomFactor,
  zoomCameraViewAt,
  type BoardZoomLimits,
} from './boardCameraZoom';
import {
  computeResponsiveCameraView,
  screenToWorldPoint,
  worldToScreenPoint,
  type CameraView,
} from './cameraViewMapping';

const CELL = GRID_DIMENSIONS.cellSize;
const WORLD = { width: GRID_DIMENSIONS.cols * CELL, height: GRID_DIMENSIONS.rows * CELL };
const LIMITS: BoardZoomLimits = { minFactor: 1, maxFactor: 3 };
/** Portrait phone viewport from the AGENTS.md checks. */
const FIT = computeResponsiveCameraView(390, 844, WORLD);

function worldEdgesOnScreen(view: CameraView) {
  return {
    topLeft: worldToScreenPoint({ x: 0, y: 0 }, view),
    bottomRight: worldToScreenPoint({ x: WORLD.width, y: WORLD.height }, view),
  };
}

describe('clampZoomFactor', () => {
  it('keeps the factor between fit and the close-up limit', () => {
    expect(clampZoomFactor(0.4, LIMITS)).toBe(1);
    expect(clampZoomFactor(2.2, LIMITS)).toBe(2.2);
    expect(clampZoomFactor(7, LIMITS)).toBe(3);
    expect(clampZoomFactor(Number.NaN, LIMITS)).toBe(1);
  });
});

describe('zoomCameraViewAt', () => {
  it('keeps the world point under the focus fixed on screen', () => {
    const focus = { x: 120, y: 500 };
    const before = screenToWorldPoint(focus, FIT);

    const zoomed = zoomCameraViewAt(FIT, focus, FIT.zoom * 2, WORLD);
    const after = screenToWorldPoint(focus, zoomed);

    expect(resolveZoomFactor(zoomed, FIT)).toBeCloseTo(2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(isZoomedIn(zoomed, FIT)).toBe(true);
    expect(isZoomedIn(FIT, FIT)).toBe(false);
  });

  it('clamps the scroll so a zoom near the edge never shows past the board', () => {
    const zoomed = zoomCameraViewAt(FIT, { x: 2, y: 2 }, FIT.zoom * 3, WORLD);
    const { topLeft, bottomRight } = worldEdgesOnScreen(zoomed);

    // The viewport stays inside the board: no empty space past any edge.
    const epsilon = 1e-9;
    expect(topLeft.x).toBeLessThanOrEqual(epsilon);
    expect(bottomRight.x).toBeGreaterThanOrEqual(390 - epsilon);
    expect(topLeft.y).toBeLessThanOrEqual(epsilon);
    expect(bottomRight.y).toBeGreaterThanOrEqual(844 - epsilon);
  });
});

describe('panCameraView', () => {
  it('moves the board with the drag and stops at the board edge', () => {
    const zoomed = zoomCameraViewAt(FIT, { x: 195, y: 422 }, FIT.zoom * 2, WORLD);
    const probe = { x: 195, y: 422 };
    const before = worldToScreenPoint(screenToWorldPoint(probe, zoomed), zoomed);

    const panned = panCameraView(zoomed, { x: 30, y: -40 }, WORLD);
    const after = worldToScreenPoint(screenToWorldPoint(probe, zoomed), panned);
    expect(after.x - before.x).toBeCloseTo(30);
    expect(after.y - before.y).toBeCloseTo(-40);

    const overPanned = panCameraView(zoomed, { x: 10_000, y: 10_000 }, WORLD);
    const edges = worldEdgesOnScreen(overPanned);
    expect(edges.topLeft.x).toBeCloseTo(0);
    expect(edges.topLeft.y).toBeCloseTo(0);
  });

  it('is a no-op at fit zoom: the whole board stays centred', () => {
    const panned = panCameraView(FIT, { x: 80, y: -120 }, WORLD);
    expect(panned.scrollX).toBeCloseTo(FIT.scrollX);
    expect(panned.scrollY).toBeCloseTo(FIT.scrollY);
  });
});

describe('clampCameraScrollToWorld', () => {
  it('letterboxes an axis the board does not fill, as the fit view does', () => {
    const clamped = clampCameraScrollToWorld({ ...FIT, scrollX: 999, scrollY: -999 }, WORLD);
    expect(clamped.scrollX).toBeCloseTo(FIT.scrollX);
    expect(clamped.scrollY).toBeCloseTo(FIT.scrollY);
  });
});

describe('refitCameraView', () => {
  it('keeps the zoom factor and the world centre across a viewport resize', () => {
    // Zoomed on the board centre, so the clamp has slack on both axes.
    const zoomed = zoomCameraViewAt(FIT, { x: 195, y: 422 }, FIT.zoom * 2, WORLD);
    const centreBefore = screenToWorldPoint({ x: 195, y: 422 }, zoomed);
    const nextFit = computeResponsiveCameraView(360, 800, WORLD);

    const refitted = refitCameraView(zoomed, FIT, nextFit, WORLD, LIMITS);

    expect(resolveZoomFactor(refitted, nextFit)).toBeCloseTo(2);
    const centreAfter = screenToWorldPoint({ x: 180, y: 400 }, refitted);
    expect(centreAfter.x).toBeCloseTo(centreBefore.x);
    expect(centreAfter.y).toBeCloseTo(centreBefore.y);
  });

  it('lands exactly on the new fit view when it was not zoomed', () => {
    const nextFit = computeResponsiveCameraView(360, 800, WORLD);
    const refitted = refitCameraView(FIT, FIT, nextFit, WORLD, LIMITS);
    expect(refitted.zoom).toBeCloseTo(nextFit.zoom);
    expect(refitted.scrollX).toBeCloseTo(nextFit.scrollX);
    expect(refitted.scrollY).toBeCloseTo(nextFit.scrollY);
  });
});
