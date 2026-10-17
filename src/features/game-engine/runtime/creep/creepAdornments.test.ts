import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CREEP_COMBAT_TRAITS, type CreepEntity } from '../../../../entities/creep';
import { CreepTypeId, UnitMoveType } from '../../../../shared/types/content-ids';
import {
  CREEP_SHADOW_OFFSET_Y_SHARE,
  CREEP_SHADOW_RENDER_DEPTH,
} from '../../scenes/creepReadability.constants';
import { CREEP_RENDER_DEPTH } from '../../scenes/gameScene.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { FakeObjectFactory, type FakeGameObject } from '../../test/fakePhaser';
import { createCreepShadowLayout, writeCreepShadowLayout } from './creepAdornmentLayout';
import { resolveHealthBarColor } from './creepAdornmentStyle';
import {
  attachCreepAdornments,
  createCreepAdornmentPool,
  drainCreepAdornmentPool,
  releaseCreepAdornments,
  syncCreepAdornments,
} from './creepAdornments';

const DISPLAY_SIZE_PX = 32;

function createScene(factory: FakeObjectFactory): Phaser.Scene {
  return { add: factory } as unknown as Phaser.Scene;
}

function createCreep(
  factory: FakeObjectFactory,
  entity: Partial<CreepEntity> = {},
): CreepRenderState {
  const sprite = factory.sprite(100, 200, 'unit');
  sprite.setDisplaySize(DISPLAY_SIZE_PX, DISPLAY_SIZE_PX);
  return {
    entity: {
      ...DEFAULT_CREEP_COMBAT_TRAITS,
      id: 'creep-1',
      type: CreepTypeId.BASIC,
      hp: 100,
      maxHp: 100,
      lifeState: 'alive',
      speed: 1,
      status: 'alive',
      position: { x: 0, y: 0 },
      pathIndex: 0,
      ...entity,
    },
    sprite: sprite as unknown as Phaser.GameObjects.Sprite,
    hitFlashRemainingMs: 0,
    deathFadeRemainingMs: 0,
  };
}

function shadowOf(creep: CreepRenderState): FakeGameObject {
  return creep.adornments?.shadow as unknown as FakeGameObject;
}

function ringOf(creep: CreepRenderState): FakeGameObject {
  return creep.adornments?.ring as unknown as FakeGameObject;
}

describe('writeCreepShadowLayout', () => {
  it('puts a ground creep shadow under its feet', () => {
    const layout = writeCreepShadowLayout(32, UnitMoveType.GROUND, createCreepShadowLayout());

    expect(layout.offsetXPx).toBe(0);
    expect(layout.offsetYPx).toBeCloseTo(32 * CREEP_SHADOW_OFFSET_Y_SHARE);
  });

  it('gives a flier a smaller, fainter shadow further below and aside', () => {
    const ground = writeCreepShadowLayout(32, UnitMoveType.GROUND, createCreepShadowLayout());
    const flier = writeCreepShadowLayout(32, UnitMoveType.AIR, createCreepShadowLayout());

    expect(flier.widthPx).toBeLessThan(ground.widthPx);
    expect(flier.alpha).toBeLessThan(ground.alpha);
    expect(flier.offsetYPx).toBeGreaterThan(ground.offsetYPx);
    expect(flier.offsetXPx).toBeGreaterThan(0);
  });
});

describe('creep adornments', () => {
  it('draws the shadow below the creep and follows the sprite', () => {
    const factory = new FakeObjectFactory();
    const creep = createCreep(factory);
    attachCreepAdornments(createScene(factory), createCreepAdornmentPool(), creep, undefined);
    const shadow = shadowOf(creep);

    expect(shadow.depth).toBe(CREEP_SHADOW_RENDER_DEPTH);
    expect(shadow.depth).toBeLessThan(CREEP_RENDER_DEPTH);
    creep.sprite.setPosition(140, 60);
    syncCreepAdornments(creep);
    expect(shadow.x).toBe(140);
    expect(shadow.y).toBeCloseTo(60 + DISPLAY_SIZE_PX * CREEP_SHADOW_OFFSET_Y_SHARE);
    expect(shadow.visible).toBe(true);
  });

  it('hides with the sprite and once the creep is dead', () => {
    const factory = new FakeObjectFactory();
    const creep = createCreep(factory);
    attachCreepAdornments(createScene(factory), createCreepAdornmentPool(), creep, undefined);

    creep.sprite.setVisible(false);
    syncCreepAdornments(creep);
    expect(shadowOf(creep).visible).toBe(false);

    creep.sprite.setVisible(true);
    creep.entity.status = 'dead';
    syncCreepAdornments(creep);
    expect(shadowOf(creep).visible).toBe(false);
  });

  it('rings a sent creep in the sender colour and leaves a baseline creep bare', () => {
    const factory = new FakeObjectFactory();
    const scene = createScene(factory);
    const pool = createCreepAdornmentPool();
    const sent = createCreep(factory, { sender: 'opponent' });
    const baseline = createCreep(factory);
    attachCreepAdornments(scene, pool, sent, 0xec7048);
    attachCreepAdornments(scene, pool, baseline, undefined);
    const sentRing = ringOf(sent);

    expect(sentRing.visible).toBe(true);
    expect(sentRing.tint).toBe(0xec7048);
    expect(sentRing.depth).toBeGreaterThan(shadowOf(sent).depth);
    expect(sentRing.depth).toBeLessThan(CREEP_RENDER_DEPTH);
    expect(ringOf(baseline).visible).toBe(false);

    // A pooled record that carried a ring loses it on a baseline creep.
    releaseCreepAdornments(sent);
    const next = createCreep(factory);
    attachCreepAdornments(scene, pool, next, undefined);
    expect(ringOf(next)).toBe(sentRing);
    expect(sentRing.visible).toBe(false);
  });

  it('shows the health bar only after damage and redraws it only when health changes', () => {
    const factory = new FakeObjectFactory();
    const creep = createCreep(factory);
    attachCreepAdornments(createScene(factory), createCreepAdornmentPool(), creep, undefined);
    const bar = creep.adornments?.healthBar;
    if (!bar) throw new Error('missing health bar');
    const fill = bar.fill as unknown as FakeGameObject;
    const back = bar.back as unknown as FakeGameObject;

    syncCreepAdornments(creep);
    expect(fill.visible).toBe(false);
    expect(back.visible).toBe(false);

    creep.entity.hp = 40;
    syncCreepAdornments(creep);
    expect(fill.visible).toBe(true);
    expect(fill.displayWidth).toBeCloseTo(bar.widthPx * 0.4);
    expect(fill.tint).toBe(resolveHealthBarColor(0.4));
    expect(fill.depth).toBeGreaterThan(CREEP_RENDER_DEPTH);
    expect(fill.y).toBeLessThan(creep.sprite.y);

    // Same health next frame: moved, not resized or recoloured.
    const setDisplaySize = vi.spyOn(fill, 'setDisplaySize');
    const setTint = vi.spyOn(fill, 'setTint');
    creep.sprite.setPosition(150, 90);
    syncCreepAdornments(creep);
    expect(setDisplaySize).not.toHaveBeenCalled();
    expect(setTint).not.toHaveBeenCalled();
    expect(fill.x).toBeCloseTo(150 - bar.widthPx / 2);

    creep.entity.status = 'dead';
    syncCreepAdornments(creep);
    expect(fill.visible).toBe(false);
  });

  it('reuses released records instead of creating new images', () => {
    const factory = new FakeObjectFactory();
    const scene = createScene(factory);
    const pool = createCreepAdornmentPool();
    const first = createCreep(factory);
    attachCreepAdornments(scene, pool, first, undefined);
    const firstShadow = shadowOf(first);
    releaseCreepAdornments(first);

    expect(first.adornments).toBeUndefined();
    expect(firstShadow.visible).toBe(false);

    const second = createCreep(factory);
    const createdBefore = factory.createdObjects.length;
    attachCreepAdornments(scene, pool, second, undefined);

    expect(factory.createdObjects.length).toBe(createdBefore);
    expect(shadowOf(second)).toBe(firstShadow);
  });

  it('destroys pooled images when the scene shuts down', () => {
    const factory = new FakeObjectFactory();
    const pool = createCreepAdornmentPool();
    const creep = createCreep(factory);
    attachCreepAdornments(createScene(factory), pool, creep, undefined);
    const shadow = shadowOf(creep);
    releaseCreepAdornments(creep);
    drainCreepAdornmentPool(pool);

    expect(shadow.isDestroyed).toBe(true);
    expect(pool.free).toHaveLength(0);
  });
});
