import { describe, expect, it } from 'vitest';
import {
  TOWER_SPRITE_KEYS,
  TOWER_SPRITE_SHEET_FRAME,
  TOWER_VISUAL_SIZE,
} from '../../../../shared/constants/sprites';
import {
  computeTowerVisualMetrics,
  getTowerVisualMetrics,
  resolveTowerStructureBox,
  toTowerSpriteFootPoint,
  unionStructureBoxes,
} from './towerVisualMetrics';

const FRAME = { width: 60, height: 60 };
const TARGET = { targetWidthWorldPx: 44, maxHeightWorldPx: 64 };
const EPSILON = 1e-9;

describe('computeTowerVisualMetrics', () => {
  it('scales a squat structure until its width meets the target', () => {
    const metrics = computeTowerVisualMetrics(
      { x: 10, y: 19, width: 40, height: 40 },
      FRAME,
      TARGET,
    );

    expect(metrics.scale).toBeCloseTo(1.1);
    expect(metrics.structureWidthPx).toBeCloseTo(44);
    expect(metrics.structureHeightPx).toBeCloseTo(44);
    expect(metrics.displayWidthPx).toBeCloseTo(66);
    expect(metrics.displayHeightPx).toBeCloseTo(66);
  });

  it('caps a slender structure by height instead', () => {
    const metrics = computeTowerVisualMetrics(
      { x: 19, y: 15, width: 22, height: 44 },
      FRAME,
      TARGET,
    );

    expect(metrics.structureHeightPx).toBeCloseTo(64);
    expect(metrics.structureWidthPx).toBeCloseTo(32);
    expect(metrics.structureWidthPx).toBeLessThan(TARGET.targetWidthWorldPx);
  });

  it('anchors the bottom centre of the structure, not of the frame', () => {
    const metrics = computeTowerVisualMetrics(
      { x: 19, y: 15, width: 22, height: 44 },
      FRAME,
      TARGET,
    );

    expect(metrics.originX).toBeCloseTo(30 / 60);
    expect(metrics.originY).toBeCloseTo(59 / 60);
  });

  it('keeps the structure inside the frame box it was measured in', () => {
    const box = { x: 3, y: 0, width: 53, height: 60 };
    const metrics = computeTowerVisualMetrics(box, FRAME, TARGET);

    // Left edge of the structure in world px, relative to the sprite position.
    const structureLeftPx = (box.x / FRAME.width - metrics.originX) * metrics.displayWidthPx;
    expect(structureLeftPx).toBeCloseTo(-metrics.structureWidthPx / 2);
    expect(metrics.originY).toBe(1);
  });
});

describe('unionStructureBoxes', () => {
  it('spans every box and skips empty slots', () => {
    expect(unionStructureBoxes([[19, 15, 23, 44], null, [17, 15, 24, 44]])).toEqual({
      x: 17,
      y: 15,
      width: 25,
      height: 44,
    });
  });

  it('is null when every slot is empty', () => {
    expect(unionStructureBoxes([null, undefined])).toBeNull();
  });
});

describe('tower sheet visual metrics', () => {
  const towerKeys = Object.values(TOWER_SPRITE_KEYS);

  it.each(towerKeys)('%s fills the width target or the height cap, never more', (spriteKey) => {
    const metrics = getTowerVisualMetrics(spriteKey);

    expect(metrics.structureWidthPx).toBeLessThanOrEqual(
      TOWER_VISUAL_SIZE.targetWidthWorldPx + EPSILON,
    );
    expect(metrics.structureHeightPx).toBeLessThanOrEqual(
      TOWER_VISUAL_SIZE.maxHeightWorldPx + EPSILON,
    );
    const fillsWidth =
      Math.abs(metrics.structureWidthPx - TOWER_VISUAL_SIZE.targetWidthWorldPx) < 1e-6;
    const fillsHeight =
      Math.abs(metrics.structureHeightPx - TOWER_VISUAL_SIZE.maxHeightWorldPx) < 1e-6;
    expect(fillsWidth || fillsHeight).toBe(true);
  });

  it('draws every race visibly larger than its 32px footprint', () => {
    for (const spriteKey of towerKeys) {
      const metrics = getTowerVisualMetrics(spriteKey);
      expect(Math.max(metrics.structureWidthPx, metrics.structureHeightPx)).toBeGreaterThan(40);
    }
  });

  it('measures the structure on the idle frames of the sheet', () => {
    expect(resolveTowerStructureBox(TOWER_SPRITE_KEYS.HUMAN_GUARD_ARCHER)).toEqual({
      x: 17,
      y: 15,
      width: 25,
      height: 44,
    });
  });

  it('treats an unscanned texture (placeholder art) as a whole-frame structure', () => {
    const metrics = getTowerVisualMetrics('placeholder.tower');

    expect(resolveTowerStructureBox('placeholder.tower')).toBeNull();
    expect(metrics.displayWidthPx).toBeCloseTo(TOWER_VISUAL_SIZE.targetWidthWorldPx);
    expect(metrics.originX).toBe(0.5);
    expect(metrics.originY).toBe(1);
    expect(TOWER_SPRITE_SHEET_FRAME.width).toBe(60);
  });
});

describe('toTowerSpriteFootPoint', () => {
  it('is the bottom centre of the 2x2 footprint', () => {
    expect(toTowerSpriteFootPoint({ x: 4, y: 6 }, 16)).toEqual({ x: 80, y: 128 });
  });
});
