import type Phaser from 'phaser';
import type { CreepEntity } from '../../../../entities/creep';
import {
  CREEP_ADORNMENT_TEXTURE_KEYS,
  CREEP_HEALTH_BAR_BACK_ALPHA,
  CREEP_HEALTH_BAR_BACK_TINT,
  CREEP_HEALTH_BAR_HEIGHT_PX,
  CREEP_HEALTH_BAR_RENDER_DEPTH,
  CREEP_HEALTH_BAR_TOP_INSET_PX,
  CREEP_HEALTH_BAR_WIDTH_SHARE,
} from '../../scenes/creepReadability.constants';
import { isHealthBarShown, resolveHealthBarColor, resolveHealthRatio } from './creepAdornmentStyle';

/** Never drawn yet: no real health ratio equals it, so the first sync draws. */
const UNDRAWN_HEALTH_RATIO = -1;

/**
 * A creep's health bar: a dark backing and a tinted fill, both stretched from
 * one shared white texture. The fill is resized and recoloured only when the
 * health ratio changes; every other frame it is just moved.
 */
export type CreepHealthBar = {
  readonly back: Phaser.GameObjects.Image;
  readonly fill: Phaser.GameObjects.Image;
  widthPx: number;
  /** From the sprite centre to the bar's vertical centre. */
  offsetYPx: number;
  drawnHealthRatio: number;
  isRevealed: boolean;
};

function createBarImage(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Image {
  const image = scene.add.image(0, 0, CREEP_ADORNMENT_TEXTURE_KEYS.BAR);
  // Left-anchored, so the fill shrinks towards the left edge.
  image.setOrigin(0, 0.5);
  image.setDepth(depth);
  image.setVisible(false);
  return image;
}

export function createCreepHealthBar(scene: Phaser.Scene): CreepHealthBar {
  const back = createBarImage(scene, CREEP_HEALTH_BAR_RENDER_DEPTH);
  back.setTint(CREEP_HEALTH_BAR_BACK_TINT);
  back.setAlpha(CREEP_HEALTH_BAR_BACK_ALPHA);
  const fill = createBarImage(scene, CREEP_HEALTH_BAR_RENDER_DEPTH);
  return {
    back,
    fill,
    widthPx: 0,
    offsetYPx: 0,
    drawnHealthRatio: UNDRAWN_HEALTH_RATIO,
    isRevealed: false,
  };
}

/** Fits a (possibly reused) bar to a new creep: hidden until its first damage. */
export function resetCreepHealthBar(bar: CreepHealthBar, displaySizePx: number): void {
  bar.widthPx = Math.round(displaySizePx * CREEP_HEALTH_BAR_WIDTH_SHARE);
  bar.offsetYPx =
    -displaySizePx / 2 + CREEP_HEALTH_BAR_TOP_INSET_PX + CREEP_HEALTH_BAR_HEIGHT_PX / 2;
  bar.drawnHealthRatio = UNDRAWN_HEALTH_RATIO;
  bar.isRevealed = false;
  bar.back.setDisplaySize(bar.widthPx, CREEP_HEALTH_BAR_HEIGHT_PX);
  hideCreepHealthBar(bar);
}

function redrawFill(bar: CreepHealthBar, healthRatio: number): void {
  bar.drawnHealthRatio = healthRatio;
  bar.isRevealed = isHealthBarShown(healthRatio, bar.isRevealed);
  bar.fill.setDisplaySize(bar.widthPx * healthRatio, CREEP_HEALTH_BAR_HEIGHT_PX);
  bar.fill.setTint(resolveHealthBarColor(healthRatio));
}

/** Per-frame: redraws only on a health change, then follows the sprite. */
export function syncCreepHealthBar(
  bar: CreepHealthBar,
  entity: Pick<CreepEntity, 'hp' | 'maxHp'>,
  spriteX: number,
  spriteY: number,
): void {
  const healthRatio = resolveHealthRatio(entity.hp, entity.maxHp);
  if (healthRatio !== bar.drawnHealthRatio) {
    redrawFill(bar, healthRatio);
  }

  bar.back.setVisible(bar.isRevealed);
  bar.fill.setVisible(bar.isRevealed);
  if (!bar.isRevealed) {
    return;
  }

  const left = spriteX - bar.widthPx / 2;
  const centerY = spriteY + bar.offsetYPx;
  bar.back.setPosition(left, centerY);
  bar.fill.setPosition(left, centerY);
}

export function hideCreepHealthBar(bar: CreepHealthBar): void {
  bar.back.setVisible(false);
  bar.fill.setVisible(false);
}

export function destroyCreepHealthBar(bar: CreepHealthBar): void {
  bar.back.destroy();
  bar.fill.destroy();
}
