/**
 * Pure gesture math for the board: pinch samples, tap classification and
 * double-tap detection. Every distance is in canvas pixels, so a pan (which
 * keeps the world under the finger still) is measured by how far the finger
 * travelled on screen.
 */

import type { ScreenPoint } from '../../runtime/camera/cameraViewMapping';

export type PinchSample = {
  /** Distance between the two fingers. */
  distance: number;
  /** Midpoint between the two fingers: the zoom focus and pan handle. */
  centre: ScreenPoint;
};

export type TapRecord = {
  atMs: number;
  x: number;
  y: number;
};

export type TapClassificationConfig = {
  touchTapMinDurationMs: number;
  touchTapMaxDurationMs: number;
  touchTapMaxMovePx: number;
};

export type DoubleTapConfig = {
  doubleTapMaxIntervalMs: number;
  doubleTapMaxMovePx: number;
};

export function measurePinch(first: ScreenPoint, second: ScreenPoint): PinchSample {
  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    centre: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
  };
}

/** The zoom factor a pinch asks for, relative to the factor it started at. */
export function resolvePinchZoomFactor(
  startZoomFactor: number,
  startDistance: number,
  distance: number,
): number {
  if (startDistance <= 0) {
    return startZoomFactor;
  }
  return startZoomFactor * (distance / startDistance);
}

export function screenDistance(from: ScreenPoint, to: ScreenPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function isTapGesture(
  durationMs: number,
  moveDistancePx: number,
  config: TapClassificationConfig,
): boolean {
  return (
    durationMs >= config.touchTapMinDurationMs &&
    durationMs <= config.touchTapMaxDurationMs &&
    moveDistancePx <= config.touchTapMaxMovePx
  );
}

/** Whether `tap` quickly follows `previous` close enough to read as a double tap. */
export function isDoubleTap(
  previous: TapRecord | null,
  tap: TapRecord,
  config: DoubleTapConfig,
): boolean {
  if (!previous) {
    return false;
  }
  return (
    tap.atMs - previous.atMs <= config.doubleTapMaxIntervalMs &&
    screenDistance(previous, tap) <= config.doubleTapMaxMovePx
  );
}

/** Wheel delta (pixels, positive away from the user) to a zoom multiplier. */
export function wheelDeltaToZoomMultiplier(deltaY: number, sensitivity: number): number {
  if (!Number.isFinite(deltaY)) {
    return 1;
  }
  return Math.exp(-deltaY * sensitivity);
}
