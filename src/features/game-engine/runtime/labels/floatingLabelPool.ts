import type Phaser from 'phaser';
import {
  DAMAGE_LABEL_BASE_FONT_SIZE_PX,
  DAMAGE_LABEL_POOL_SIZE,
  DAMAGE_LABEL_RENDER_DEPTH,
} from '../../scenes/floatingLabel.constants';

/**
 * A fixed set of BitmapTexts for damage numbers, created once per scene and
 * shared by both battlefields. A hit takes a hidden label and its expiry hands
 * it back, so combat never creates or destroys a text object; when every
 * label is out, the hit simply shows no number.
 */
export type FloatingLabelPool = {
  /** Every label the pool owns, out or free, in creation order. */
  readonly labels: Phaser.GameObjects.BitmapText[];
  /** Labels ready to show; a stack. */
  readonly free: Phaser.GameObjects.BitmapText[];
  /** Bitmap font the labels currently draw with; null before the first install. */
  fontKey: string | null;
  /**
   * Raster pixels per world pixel the labels are drawn at; plain Text labels
   * (effect pips) read it when they are created. 1 until the runtime sets it.
   */
  rasterScale: number;
};

export function createFloatingLabelPool(): FloatingLabelPool {
  return { labels: [], free: [], fontKey: null, rasterScale: 1 };
}

/** Creates the labels (once) and points them at `fontKey`. */
export function fillFloatingLabelPool(
  scene: Phaser.Scene,
  pool: FloatingLabelPool,
  fontKey: string,
  size: number = DAMAGE_LABEL_POOL_SIZE,
): void {
  pool.fontKey = fontKey;
  while (pool.labels.length < size) {
    const label = scene.add.bitmapText(0, 0, fontKey, '', DAMAGE_LABEL_BASE_FONT_SIZE_PX);
    label.setOrigin(0.5);
    label.setDepth(DAMAGE_LABEL_RENDER_DEPTH);
    label.setVisible(false);
    pool.labels.push(label);
    pool.free.push(label);
  }
}

/** A hidden label to show, or undefined when every label is out (or none exist yet). */
export function acquireFloatingLabel(
  pool: FloatingLabelPool,
): Phaser.GameObjects.BitmapText | undefined {
  const label = pool.free.pop();
  label?.setVisible(true);
  return label;
}

export function releaseFloatingLabel(
  pool: FloatingLabelPool,
  label: Phaser.GameObjects.BitmapText,
): void {
  label.setVisible(false);
  pool.free.push(label);
}

/** Re-points every label, out or free, at a newly installed font. */
export function setFloatingLabelFont(pool: FloatingLabelPool, fontKey: string): void {
  pool.fontKey = fontKey;
  for (const label of pool.labels) {
    // setFont keeps the label's own size and text.
    label.setFont(fontKey);
  }
}

/** Scene teardown: destroys every label. */
export function drainFloatingLabelPool(pool: FloatingLabelPool): void {
  for (const label of pool.labels) {
    label.destroy();
  }
  pool.labels.length = 0;
  pool.free.length = 0;
  pool.fontKey = null;
}
