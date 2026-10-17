import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { fakePhaserModule } from '../../test/fakeSceneSystems';
import { FakeEventEmitter, FakeObjectFactory, type FakeGameObject } from '../../test/fakePhaser';
import { DAMAGE_LABEL_POOL_SIZE } from '../../scenes/floatingLabel.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import { computeCanvasResolution } from '../camera/canvasResolution';
import { setCanvasResolution } from '../camera/canvasResolutionRuntime';
import { applyEffectPipResolution } from '../combat/creepEffectVisuals';
import { createFloatingLabelPool, drainFloatingLabelPool } from './floatingLabelPool';
import { registerFloatingLabels } from './floatingLabelRuntime';
import { resolveLabelRasterScale } from './labelRasterScale';

vi.mock('phaser', () => fakePhaserModule);

type FakeLabelScene = {
  scene: Phaser.Scene;
  game: object;
  scale: FakeEventEmitter & { width: number; height: number };
  add: FakeObjectFactory;
  fonts: Set<string>;
  removedTextures: string[];
};

function createLabelScene(): FakeLabelScene {
  const game = {};
  const scale = Object.assign(new FakeEventEmitter(), { width: 390, height: 844 });
  const add = new FakeObjectFactory();
  const fonts = new Set<string>();
  const removedTextures: string[] = [];
  const scene = {
    game,
    scale,
    add,
    // No canvas in node: the font is registered by key only, labels still bind to it.
    textures: {
      createCanvas: () => null,
      exists: () => true,
      remove: (key: string) => removedTextures.push(key),
    },
    cache: {
      bitmapFont: {
        exists: (key: string) => fonts.has(key),
        add: (key: string) => fonts.add(key),
        remove: (key: string) => fonts.delete(key),
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, game, scale, add, fonts, removedTextures };
}

function setPixelRatio(fake: FakeLabelScene, pixelRatio: number): void {
  setCanvasResolution(fake.game, computeCanvasResolution(390, 844, pixelRatio, 3));
  fake.scale.emit('resize');
}

function labelsOf(fake: FakeLabelScene): FakeGameObject[] {
  return fake.add.createdObjects.filter((object) => object.kind === 'bitmapText');
}

describe('floating label runtime', () => {
  it('rasterises labels at the current canvas pixel ratio', () => {
    const fake = createLabelScene();
    setCanvasResolution(fake.game, computeCanvasResolution(390, 844, 2, 3));
    const pool = createFloatingLabelPool();

    registerFloatingLabels({ scene: fake.scene, pool, onRasterScaleChanged: vi.fn() });

    expect(pool.rasterScale).toBe(resolveLabelRasterScale(2));
    expect(labelsOf(fake)).toHaveLength(DAMAGE_LABEL_POOL_SIZE);
    expect(labelsOf(fake).every((label) => label.font === pool.fontKey)).toBe(true);
    expect(pool.fontKey).toContain(`@${resolveLabelRasterScale(2)}#`);
  });

  it('follows a pixel ratio change: new atlas, same labels, pips told, old atlas dropped', () => {
    const fake = createLabelScene();
    setCanvasResolution(fake.game, computeCanvasResolution(390, 844, 1, 3));
    const pool = createFloatingLabelPool();
    const onRasterScaleChanged = vi.fn();
    registerFloatingLabels({ scene: fake.scene, pool, onRasterScaleChanged });
    const labels = labelsOf(fake);
    const firstFont = pool.fontKey;

    setPixelRatio(fake, 3);

    expect(pool.rasterScale).toBe(resolveLabelRasterScale(3));
    expect(onRasterScaleChanged).toHaveBeenCalledExactlyOnceWith(resolveLabelRasterScale(3));
    expect(labelsOf(fake)).toEqual(labels);
    expect(labels.every((label) => label.font === pool.fontKey)).toBe(true);
    expect(pool.fontKey).not.toBe(firstFont);
    expect(fake.fonts.has(firstFont ?? '')).toBe(false);
    expect(fake.removedTextures).toEqual([firstFont]);
  });

  it('ignores a resize that keeps the ratio', () => {
    const fake = createLabelScene();
    setCanvasResolution(fake.game, computeCanvasResolution(390, 844, 2, 3));
    const pool = createFloatingLabelPool();
    const onRasterScaleChanged = vi.fn();
    registerFloatingLabels({ scene: fake.scene, pool, onRasterScaleChanged });
    const fontKey = pool.fontKey;

    setCanvasResolution(fake.game, computeCanvasResolution(400, 700, 2, 3));
    fake.scale.emit('resize');

    expect(pool.fontKey).toBe(fontKey);
    expect(onRasterScaleChanged).not.toHaveBeenCalled();
  });

  it('redraws the atlas once the web font is ready, and stops after teardown', async () => {
    const fake = createLabelScene();
    const pool = createFloatingLabelPool();
    let resolveFont: () => void = () => undefined;
    const fontReady = new Promise<void>((resolve) => {
      resolveFont = resolve;
    });
    const teardown = registerFloatingLabels({
      scene: fake.scene,
      pool,
      onRasterScaleChanged: vi.fn(),
      whenFontReady: () => fontReady,
    });
    const fallbackFont = pool.fontKey;

    resolveFont();
    await fontReady;
    await Promise.resolve();

    expect(pool.fontKey).not.toBe(fallbackFont);
    expect(labelsOf(fake).every((label) => label.font === pool.fontKey)).toBe(true);

    const liveFont = pool.fontKey;
    teardown();
    setPixelRatio(fake, 2);
    expect(pool.fontKey).toBe(liveFont);
    expect(fake.fonts.has(liveFont ?? '')).toBe(false);

    drainFloatingLabelPool(pool);
    expect(labelsOf(fake).every((label) => label.isDestroyed)).toBe(true);
  });

  it('re-rasterises live effect pips at a new scale', () => {
    const setResolution = vi.fn();
    const pips = { style: { resolution: 1.5 }, setResolution };
    const creeps = [
      { effectPips: pips },
      { effectPips: undefined },
    ] as unknown as CreepRenderState[];

    applyEffectPipResolution(creeps, 4.5);
    applyEffectPipResolution(creeps, 1.5);

    expect(setResolution).toHaveBeenCalledExactlyOnceWith(4.5);
  });
});
