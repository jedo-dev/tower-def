import { describe, expect, it } from 'vitest';
import {
  computeLeftSideSceneryPlacement,
  computeRightSideSceneryPlacement,
  resolveSideSceneryScale,
  SIDE_SCENERY_GRID_OVERLAP_WORLD_PX,
} from './sideSceneryLayout';

/** The 20x30 board at 16 px cells. */
const BOARD = { width: 320, height: 480 };
const TEXTURE = { width: 430, height: 1254 };

function leftEdge(x: number, width: number): number {
  return x - width / 2;
}

function rightEdge(x: number, width: number): number {
  return x + width / 2;
}

describe('side scenery layout (tower-def-jsl)', () => {
  it('scales uniformly so the strip is exactly as tall as the board', () => {
    const scale = resolveSideSceneryScale(BOARD, TEXTURE);
    expect(scale).toBeCloseTo(480 / 1254);

    const left = computeLeftSideSceneryPlacement(BOARD, TEXTURE);
    expect(left.displayHeight).toBeCloseTo(480);
    expect(left.displayWidth).toBeCloseTo(430 * (480 / 1254));
    expect(left.displayWidth).toBeGreaterThan(160);
    expect(left.displayWidth).toBeLessThan(175);
  });

  it('puts the left strip inner edge on the grid left edge, top-aligned', () => {
    const left = computeLeftSideSceneryPlacement(BOARD, TEXTURE, 0);
    expect(rightEdge(left.x, left.displayWidth)).toBeCloseTo(0);
    expect(left.y - left.displayHeight / 2).toBeCloseTo(0);
  });

  it('puts the right strip inner edge on the grid right edge, top-aligned', () => {
    const right = computeRightSideSceneryPlacement(BOARD, TEXTURE, 0);
    expect(leftEdge(right.x, right.displayWidth)).toBeCloseTo(320);
    expect(right.y - right.displayHeight / 2).toBeCloseTo(0);
  });

  it('tucks both strips under the grid by the default overlap', () => {
    const left = computeLeftSideSceneryPlacement(BOARD, TEXTURE);
    const right = computeRightSideSceneryPlacement(BOARD, TEXTURE);
    expect(rightEdge(left.x, left.displayWidth)).toBeCloseTo(SIDE_SCENERY_GRID_OVERLAP_WORLD_PX);
    expect(leftEdge(right.x, right.displayWidth)).toBeCloseTo(
      320 - SIDE_SCENERY_GRID_OVERLAP_WORLD_PX,
    );
  });

  it('keeps each strip its own width when the textures differ', () => {
    const narrow = computeLeftSideSceneryPlacement(BOARD, { width: 410, height: 1254 }, 0);
    const wide = computeRightSideSceneryPlacement(BOARD, { width: 460, height: 1254 }, 0);
    expect(narrow.displayWidth).toBeCloseTo(410 * (480 / 1254));
    expect(wide.displayWidth).toBeCloseTo(460 * (480 / 1254));
    expect(rightEdge(narrow.x, narrow.displayWidth)).toBeCloseTo(0);
    expect(leftEdge(wide.x, wide.displayWidth)).toBeCloseTo(320);
  });

  it('collapses to scale 0 for an unknown texture size', () => {
    expect(resolveSideSceneryScale(BOARD, { width: 0, height: 0 })).toBe(0);
    const left = computeLeftSideSceneryPlacement(BOARD, { width: 0, height: 0 });
    expect(left.scale).toBe(0);
    expect(left.displayWidth).toBe(0);
  });
});
