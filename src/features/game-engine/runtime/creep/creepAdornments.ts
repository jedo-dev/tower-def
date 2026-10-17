import type Phaser from 'phaser';
import {
  CREEP_ADORNMENT_TEXTURE_KEYS,
  CREEP_SENDER_RING_ALPHA,
  CREEP_SENDER_RING_HEIGHT_SHARE,
  CREEP_SENDER_RING_RENDER_DEPTH,
  CREEP_SENDER_RING_WIDTH_SHARE,
  CREEP_SHADOW_RENDER_DEPTH,
} from '../../scenes/creepReadability.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  createRenderRecordPool,
  releasePooledRecord,
  takePooledRecord,
  type RenderRecordPool,
} from '../combat/renderRecordPool';
import {
  createCreepShadowLayout,
  writeCreepShadowLayout,
  type CreepShadowLayout,
} from './creepAdornmentLayout';
import {
  createCreepHealthBar,
  destroyCreepHealthBar,
  hideCreepHealthBar,
  resetCreepHealthBar,
  syncCreepHealthBar,
  type CreepHealthBar,
} from './creepHealthBar';

/**
 * The readability layer drawn with a creep (tower-def-3br): a ground shadow
 * and, under a sent creep, a ring in the sender race's accent colour, plus
 * a health bar above it once it is hurt.
 * Records and their images are pooled, so a spawn after the first waves
 * allocates nothing, and the per-frame sync only moves and toggles them.
 */
export type CreepAdornments = {
  readonly pool: CreepAdornmentPool;
  readonly shadow: Phaser.GameObjects.Image;
  readonly shadowLayout: CreepShadowLayout;
  /** Always created so a pooled record serves any creep; hidden on baseline creeps. */
  readonly ring: Phaser.GameObjects.Image;
  hasRing: boolean;
  /** Hidden until the creep first takes damage. */
  readonly healthBar: CreepHealthBar;
};

export type CreepAdornmentPool = RenderRecordPool<CreepAdornments>;

export function createCreepAdornmentPool(): CreepAdornmentPool {
  return createRenderRecordPool<CreepAdornments>();
}

function createCreepAdornments(scene: Phaser.Scene, pool: CreepAdornmentPool): CreepAdornments {
  const shadow = scene.add.image(0, 0, CREEP_ADORNMENT_TEXTURE_KEYS.SHADOW);
  shadow.setDepth(CREEP_SHADOW_RENDER_DEPTH);
  const ring = scene.add.image(0, 0, CREEP_ADORNMENT_TEXTURE_KEYS.RING);
  ring.setDepth(CREEP_SENDER_RING_RENDER_DEPTH);
  ring.setAlpha(CREEP_SENDER_RING_ALPHA);
  ring.setVisible(false);
  return {
    pool,
    shadow,
    shadowLayout: createCreepShadowLayout(),
    ring,
    hasRing: false,
    healthBar: createCreepHealthBar(scene),
  };
}

/**
 * Gives a freshly spawned creep its adornments, reusing a released record when
 * one is free. `ringColor` is the sender race accent (`resolveSenderRingColor`);
 * undefined for a baseline creep, which gets no ring.
 */
export function attachCreepAdornments(
  scene: Phaser.Scene,
  pool: CreepAdornmentPool,
  creep: CreepRenderState,
  ringColor: number | undefined,
): void {
  const adornments = takePooledRecord(pool) ?? createCreepAdornments(scene, pool);
  const displaySizePx = creep.sprite.displayWidth;

  const layout = writeCreepShadowLayout(
    displaySizePx,
    creep.entity.moveType,
    adornments.shadowLayout,
  );
  adornments.shadow.setDisplaySize(layout.widthPx, layout.heightPx);
  adornments.shadow.setAlpha(layout.alpha);

  adornments.hasRing = ringColor !== undefined;
  if (ringColor !== undefined) {
    adornments.ring.setTint(ringColor);
    adornments.ring.setDisplaySize(
      displaySizePx * CREEP_SENDER_RING_WIDTH_SHARE,
      displaySizePx * CREEP_SENDER_RING_HEIGHT_SHARE,
    );
  }

  resetCreepHealthBar(adornments.healthBar, displaySizePx);

  creep.adornments = adornments;
  syncCreepAdornments(creep);
}

/**
 * Follows the sprite: shown only while the creep is alive and its field is in
 * view. Called once per frame after movement and the view visibility pass.
 */
export function syncCreepAdornments(creep: CreepRenderState): void {
  const adornments = creep.adornments;
  if (adornments === undefined) {
    return;
  }

  const sprite = creep.sprite;
  const isShown = sprite.visible && creep.entity.status === 'alive';
  adornments.shadow.setVisible(isShown);
  adornments.ring.setVisible(isShown && adornments.hasRing);
  if (!isShown) {
    hideCreepHealthBar(adornments.healthBar);
    return;
  }
  syncCreepHealthBar(adornments.healthBar, creep.entity, sprite.x, sprite.y);

  // The ring lies on the ground around the shadow, also under a flier.
  const shadowLayout = adornments.shadowLayout;
  const groundX = sprite.x + shadowLayout.offsetXPx;
  const groundY = sprite.y + shadowLayout.offsetYPx;
  adornments.shadow.setPosition(groundX, groundY);
  if (adornments.hasRing) {
    adornments.ring.setPosition(groundX, groundY);
  }
}

/** Index loop over a field's creeps, so the per-frame pass allocates nothing. */
export function syncCreepListAdornments(creeps: readonly CreepRenderState[]): void {
  for (let index = 0; index < creeps.length; index += 1) {
    syncCreepAdornments(creeps[index]);
  }
}

function destroyCreepAdornments(adornments: CreepAdornments): void {
  adornments.shadow.destroy();
  adornments.ring.destroy();
  destroyCreepHealthBar(adornments.healthBar);
}

/** Hides a creep's adornments and hands them back to their pool (destroyed once it is full). */
export function releaseCreepAdornments(creep: CreepRenderState): void {
  const adornments = creep.adornments;
  if (adornments === undefined) {
    return;
  }
  creep.adornments = undefined;
  adornments.shadow.setVisible(false);
  adornments.ring.setVisible(false);
  hideCreepHealthBar(adornments.healthBar);

  const { pool } = adornments;
  if (pool.free.length >= pool.capacity) {
    destroyCreepAdornments(adornments);
    return;
  }
  releasePooledRecord(pool, adornments);
}

/** Scene shutdown: the pooled images die with the scene, so the pool must not hand them out again. */
export function drainCreepAdornmentPool(pool: CreepAdornmentPool): void {
  for (let index = 0; index < pool.free.length; index += 1) {
    destroyCreepAdornments(pool.free[index]);
  }
  pool.free.length = 0;
}
