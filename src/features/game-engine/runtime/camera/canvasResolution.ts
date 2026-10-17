import type { CameraView, ScreenPoint } from './cameraViewMapping';

/**
 * Pure math for rendering the game canvas at device resolution.
 *
 * The canvas keeps its CSS (layout) size, and everything the scene reasons
 * about on screen — the camera view, pointer positions, tap and pan
 * thresholds — stays in CSS pixels. Only the canvas backing store and the
 * Phaser camera are scaled by the pixel ratio, so a DPR 3 phone draws 3x the
 * pixels instead of letting the browser upscale a CSS-sized bitmap.
 */

export type CanvasResolution = {
  /** Layout size of the canvas in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
  /** Backing-store pixels per CSS pixel the camera renders with. */
  pixelRatio: number;
  /** Canvas backing-store size in device pixels. */
  backingWidth: number;
  backingHeight: number;
};

/**
 * The pixel ratio to render at: the device ratio, never below 1 (zoomed-out
 * desktop browsers report < 1) and never above `maxPixelRatio`, which bounds
 * the fill rate on dense phone screens.
 */
export function resolveCanvasPixelRatio(devicePixelRatio: number, maxPixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 1) {
    return 1;
  }
  return Math.min(devicePixelRatio, maxPixelRatio);
}

/** Sizes the backing store for a CSS size; an empty (hidden) host still gets 1x1. */
export function computeCanvasResolution(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxPixelRatio: number,
): CanvasResolution {
  const pixelRatio = resolveCanvasPixelRatio(devicePixelRatio, maxPixelRatio);
  const safeCssWidth = Math.max(1, cssWidth);
  const safeCssHeight = Math.max(1, cssHeight);

  return {
    cssWidth: safeCssWidth,
    cssHeight: safeCssHeight,
    pixelRatio,
    backingWidth: Math.max(1, Math.round(safeCssWidth * pixelRatio)),
    backingHeight: Math.max(1, Math.round(safeCssHeight * pixelRatio)),
  };
}

export function isSameCanvasResolution(first: CanvasResolution, second: CanvasResolution): boolean {
  return (
    first.cssWidth === second.cssWidth &&
    first.cssHeight === second.cssHeight &&
    first.pixelRatio === second.pixelRatio &&
    first.backingWidth === second.backingWidth &&
    first.backingHeight === second.backingHeight
  );
}

/**
 * The CSS-pixel camera view expressed in backing-store pixels: viewport and
 * zoom scale by the ratio, and scroll shifts so the zoom origin (the viewport
 * centre) still lands on the same world point. Every world point then renders
 * at exactly `pixelRatio` times its CSS-pixel screen position.
 */
export function toBackingCameraView(view: CameraView, pixelRatio: number): CameraView {
  const originShift = pixelRatio - 1;

  return {
    viewportX: view.viewportX * pixelRatio,
    viewportY: view.viewportY * pixelRatio,
    viewportWidth: view.viewportWidth * pixelRatio,
    viewportHeight: view.viewportHeight * pixelRatio,
    zoom: view.zoom * pixelRatio,
    scrollX: view.scrollX - (originShift * view.viewportWidth) / 2,
    scrollY: view.scrollY - (originShift * view.viewportHeight) / 2,
  };
}

/**
 * A game-size (backing-store) pixel position back in CSS pixels, given the
 * backing pixels per CSS pixel the canvas is displayed with. A degenerate
 * scale (canvas not laid out yet) maps 1:1.
 */
export function toCssScreenPoint(backing: ScreenPoint, displayScale: ScreenPoint): ScreenPoint {
  return {
    x: backing.x / toUsableScale(displayScale.x),
    y: backing.y / toUsableScale(displayScale.y),
  };
}

function toUsableScale(scale: number): number {
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}
