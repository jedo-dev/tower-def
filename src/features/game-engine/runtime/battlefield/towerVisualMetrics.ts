import { TOWER_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import {
  TOWER_SPRITE_SHEET_FRAME,
  TOWER_VISUAL_SIZE,
  resolveTowerSheetFrameLayout,
} from '../../../../shared/constants/sprites';
import {
  TOWER_SHEET_METRICS,
  type TowerSheetFrameBox,
} from '../../../../shared/constants/towerSheetMetrics.generated';
import type { GridPosition } from '../../../../shared/types/pathfinding';

/** The painted structure inside a sheet frame, in frame pixels. */
export type TowerStructureBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TowerFrameSize = {
  width: number;
  height: number;
};

export type TowerVisualTarget = {
  targetWidthWorldPx: number;
  maxHeightWorldPx: number;
};

/** How a tower sheet is drawn: one scale for every frame, so upgrades never jump. */
export type TowerVisualMetrics = {
  /** World pixels per frame pixel. */
  scale: number;
  displayWidthPx: number;
  displayHeightPx: number;
  /** Origin that puts the structure's bottom centre on the sprite position. */
  originX: number;
  originY: number;
  /** Drawn size of the structure itself. */
  structureWidthPx: number;
  structureHeightPx: number;
};

/** Smallest box holding every given box; null when none is given. */
export function unionStructureBoxes(
  boxes: readonly (TowerSheetFrameBox | null | undefined)[],
): TowerStructureBox | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const box of boxes) {
    if (!box) {
      continue;
    }
    left = Math.min(left, box[0]);
    top = Math.min(top, box[1]);
    right = Math.max(right, box[0] + box[2]);
    bottom = Math.max(bottom, box[1] + box[3]);
  }
  if (right <= left || bottom <= top) {
    return null;
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * The resting structure of a sheet: the union of its idle frames. Build and
 * sell frames show a partial building and attack frames add muzzle effects,
 * so neither decides the size. Null when the sheet was never scanned.
 */
export function resolveTowerStructureBox(spriteKey: string): TowerStructureBox | null {
  const metrics = TOWER_SHEET_METRICS[spriteKey];
  if (!metrics) {
    return null;
  }
  const idleFrames = resolveTowerSheetFrameLayout(spriteKey).idle;
  return unionStructureBoxes(idleFrames.map((frame) => metrics.frameBoxes[frame]));
}

/**
 * Scales the structure until its width meets the target, unless its height
 * hits the cap first, and anchors its bottom centre: towers overhang upward.
 */
export function computeTowerVisualMetrics(
  structure: TowerStructureBox,
  frame: TowerFrameSize,
  target: TowerVisualTarget,
): TowerVisualMetrics {
  const scale = Math.min(
    target.targetWidthWorldPx / structure.width,
    target.maxHeightWorldPx / structure.height,
  );
  return {
    scale,
    displayWidthPx: frame.width * scale,
    displayHeightPx: frame.height * scale,
    originX: (structure.x + structure.width / 2) / frame.width,
    originY: (structure.y + structure.height) / frame.height,
    structureWidthPx: structure.width * scale,
    structureHeightPx: structure.height * scale,
  };
}

/** Placeholder art and unscanned sheets: the whole frame is the structure. */
const WHOLE_FRAME_BOX: TowerStructureBox = {
  x: 0,
  y: 0,
  width: TOWER_SPRITE_SHEET_FRAME.width,
  height: TOWER_SPRITE_SHEET_FRAME.height,
};

const metricsCache = new Map<string, TowerVisualMetrics>();

/** Visual metrics of a tower texture, computed once per sheet. */
export function getTowerVisualMetrics(textureKey: string): TowerVisualMetrics {
  const cached = metricsCache.get(textureKey);
  if (cached) {
    return cached;
  }
  const metrics = computeTowerVisualMetrics(
    resolveTowerStructureBox(textureKey) ?? WHOLE_FRAME_BOX,
    TOWER_SPRITE_SHEET_FRAME,
    TOWER_VISUAL_SIZE,
  );
  metricsCache.set(textureKey, metrics);
  return metrics;
}

/** World point a tower sprite stands on: the bottom centre of its footprint. */
export function toTowerSpriteFootPoint(
  anchor: GridPosition,
  cellSizePx: number = GRID_DIMENSIONS.cellSize,
): { x: number; y: number } {
  return {
    x: (anchor.x + TOWER_FOOTPRINT.width / 2) * cellSizePx,
    y: (anchor.y + TOWER_FOOTPRINT.height) * cellSizePx,
  };
}
