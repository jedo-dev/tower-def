import type Phaser from 'phaser';
import {
  CREEP_ADORNMENT_TEXTURE_KEYS,
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

/**
 * The readability layer drawn with a creep (tower-def-3br): a ground shadow.
 * Records and their images are pooled, so a spawn after the first waves
 * allocates nothing, and the per-frame sync only moves and toggles them.
 */
export type CreepAdornments = {
  readonly pool: CreepAdornmentPool;
  readonly shadow: Phaser.GameObjects.Image;
  readonly shadowLayout: CreepShadowLayout;
};

export type CreepAdornmentPool = RenderRecordPool<CreepAdornments>;

export function createCreepAdornmentPool(): CreepAdornmentPool {
  return createRenderRecordPool<CreepAdornments>();
}

function createCreepAdornments(scene: Phaser.Scene, pool: CreepAdornmentPool): CreepAdornments {
  const shadow = scene.add.image(0, 0, CREEP_ADORNMENT_TEXTURE_KEYS.SHADOW);
  shadow.setDepth(CREEP_SHADOW_RENDER_DEPTH);
  return { pool, shadow, shadowLayout: createCreepShadowLayout() };
}

/** Gives a freshly spawned creep its adornments, reusing a released record when one is free. */
export function attachCreepAdornments(
  scene: Phaser.Scene,
  pool: CreepAdornmentPool,
  creep: CreepRenderState,
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
  if (!isShown) {
    return;
  }

  const shadowLayout = adornments.shadowLayout;
  adornments.shadow.setPosition(
    sprite.x + shadowLayout.offsetXPx,
    sprite.y + shadowLayout.offsetYPx,
  );
}

/** Index loop over a field's creeps, so the per-frame pass allocates nothing. */
export function syncCreepListAdornments(creeps: readonly CreepRenderState[]): void {
  for (let index = 0; index < creeps.length; index += 1) {
    syncCreepAdornments(creeps[index]);
  }
}

function destroyCreepAdornments(adornments: CreepAdornments): void {
  adornments.shadow.destroy();
}

/** Hides a creep's adornments and hands them back to their pool (destroyed once it is full). */
export function releaseCreepAdornments(creep: CreepRenderState): void {
  const adornments = creep.adornments;
  if (adornments === undefined) {
    return;
  }
  creep.adornments = undefined;
  adornments.shadow.setVisible(false);

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
