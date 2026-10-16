import { describe, expect, it } from 'vitest';
import {
  isDoubleTap,
  isTapGesture,
  measurePinch,
  resolvePinchZoomFactor,
  wheelDeltaToZoomMultiplier,
} from './boardGestures';

const TAP_CONFIG = { touchTapMinDurationMs: 0, touchTapMaxDurationMs: 350, touchTapMaxMovePx: 12 };
const DOUBLE_TAP_CONFIG = { doubleTapMaxIntervalMs: 300, doubleTapMaxMovePx: 24 };

describe('measurePinch', () => {
  it('reports the finger distance and midpoint', () => {
    expect(measurePinch({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({
      distance: 50,
      centre: { x: 25, y: 40 },
    });
  });
});

describe('resolvePinchZoomFactor', () => {
  it('scales the starting factor by how far the fingers spread', () => {
    expect(resolvePinchZoomFactor(1, 100, 250)).toBeCloseTo(2.5);
    expect(resolvePinchZoomFactor(2, 100, 50)).toBeCloseTo(1);
    // Fingers that started on the same point cannot express a ratio.
    expect(resolvePinchZoomFactor(1.5, 0, 80)).toBe(1.5);
  });
});

describe('isTapGesture', () => {
  it('accepts a short still press and rejects a long or travelling one', () => {
    expect(isTapGesture(120, 4, TAP_CONFIG)).toBe(true);
    expect(isTapGesture(400, 4, TAP_CONFIG)).toBe(false);
    expect(isTapGesture(120, 13, TAP_CONFIG)).toBe(false);
  });
});

describe('isDoubleTap', () => {
  it('pairs two quick taps on the same spot only', () => {
    const first = { atMs: 1000, x: 100, y: 100 };
    expect(isDoubleTap(first, { atMs: 1250, x: 110, y: 95 }, DOUBLE_TAP_CONFIG)).toBe(true);
    expect(isDoubleTap(first, { atMs: 1400, x: 100, y: 100 }, DOUBLE_TAP_CONFIG)).toBe(false);
    expect(isDoubleTap(first, { atMs: 1100, x: 140, y: 100 }, DOUBLE_TAP_CONFIG)).toBe(false);
    expect(isDoubleTap(null, { atMs: 1100, x: 100, y: 100 }, DOUBLE_TAP_CONFIG)).toBe(false);
  });
});

describe('wheelDeltaToZoomMultiplier', () => {
  it('zooms in on a wheel towards the user and out away from it', () => {
    expect(wheelDeltaToZoomMultiplier(-100, 0.0015)).toBeGreaterThan(1);
    expect(wheelDeltaToZoomMultiplier(100, 0.0015)).toBeLessThan(1);
    expect(wheelDeltaToZoomMultiplier(0, 0.0015)).toBe(1);
    expect(wheelDeltaToZoomMultiplier(Number.NaN, 0.0015)).toBe(1);
  });
});
