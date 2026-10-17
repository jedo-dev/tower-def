import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { computeCanvasResolution } from '../runtime/camera/canvasResolution';
import { resolveLabelRasterScale } from '../runtime/labels/labelRasterScale';
import type { FakeGameObject } from '../test/fakePhaser';
import { FAKE_VIEWPORT } from '../test/fakeSceneSystems';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { DAMAGE_LABEL_POOL_SIZE } from './floatingLabel.constants';
import { MAX_CANVAS_PIXEL_RATIO } from './gameScene.constants';

const ACTION_COOLDOWN_FRAMES = 12;
const MAX_FRAMES = 6000;

type CanvasResolutionRuntime = typeof import('../runtime/camera/canvasResolutionRuntime');
/** Loaded after the harness mocks Phaser, so it is the instance the scene reads. */
let setCanvasResolution: CanvasResolutionRuntime['setCanvasResolution'];

function labelsOf(game: GameSceneHarness): FakeGameObject[] {
  return game.createdObjects().filter((object) => object.kind === 'bitmapText');
}

function textsOf(game: GameSceneHarness): FakeGameObject[] {
  return game.createdObjects().filter((object) => object.kind === 'text');
}

/** A row of archers just above the default map's straight route. */
function buildArchers(game: GameSceneHarness): void {
  game.command('select-tower', { towerType: TowerTypeId.SINGLE });
  for (let x = 2; x <= 8; x += 2) {
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickBuildAnchor({ x, y: 11 });
  }
  game.tick(ACTION_COOLDOWN_FRAMES);
}

/** Labels borrowed by a live damage number on either field. */
function liveLabels(game: GameSceneHarness): Set<unknown> {
  const { playerField, opponentField } = game.inspect();
  return new Set(
    [...playerField.damageNumbers, ...opponentField.damageNumbers].map((record) => record.label),
  );
}

/** Every label not borrowed by a live number is back in the pool, hidden. */
function expectOnlyLiveLabelsShown(game: GameSceneHarness, pool: readonly FakeGameObject[]): void {
  const live = liveLabels(game);
  expect(pool.filter((label) => !live.has(label)).every((label) => !label.visible)).toBe(true);
}

function emulateDevicePixelRatio(game: GameSceneHarness, devicePixelRatio: number): number {
  const resolution = computeCanvasResolution(
    FAKE_VIEWPORT.width,
    FAKE_VIEWPORT.height,
    devicePixelRatio,
    MAX_CANVAS_PIXEL_RATIO,
  );
  setCanvasResolution(game.systems.game, resolution);
  game.systems.scale.width = resolution.backingWidth;
  game.systems.scale.height = resolution.backingHeight;
  game.systems.scale.emit('resize');
  return resolution.pixelRatio;
}

describe('GameScene floating labels (tower-def-0zc)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
    ({ setCanvasResolution } = await import('../runtime/camera/canvasResolutionRuntime'));
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  it('pre-creates a fixed, hidden damage label pool', async () => {
    harness = await createGameSceneHarness();
    const labels = labelsOf(harness);

    expect(labels).toHaveLength(DAMAGE_LABEL_POOL_SIZE);
    expect(labels.every((label) => !label.visible && !label.isDestroyed)).toBe(true);
  });

  it('shows a damage number on a pooled label and hands the label back when it expires', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    buildArchers(game);
    const pool = labelsOf(game);
    const textsBefore = textsOf(game).length;

    game.command('start-wave', undefined);
    game.tickUntil(() => game.inspect().playerField.damageNumbers.length > 0, MAX_FRAMES);

    const [shown] = game.inspect().playerField.damageNumbers;
    const label = shown.label as unknown as FakeGameObject;
    expect(pool).toContain(label);
    expect(label.visible).toBe(true);
    expect(Number(label.text)).toBeGreaterThan(0);

    game.tickUntil(() => !liveLabels(game).has(label), MAX_FRAMES);
    expect(label.visible).toBe(false);
    expectOnlyLiveLabelsShown(game, pool);

    // A whole wave later: the same labels, none created or destroyed, and no text per hit.
    game.tickUntil(() => game.inspect().wavePhaseState.phase !== 'wave', MAX_FRAMES);
    expect(labelsOf(game)).toEqual(pool);
    expect(pool.every((pooled) => !pooled.isDestroyed)).toBe(true);
    expectOnlyLiveLabelsShown(game, pool);
    // Damage numbers no longer create Text; only the rare effect pips may.
    expect(textsOf(game).length - textsBefore).toBeLessThan(5);
  });

  it('re-points the pool at a new atlas when the pixel ratio changes', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    const pool = labelsOf(game);
    const fontAt1x = pool[0].font;
    expect(fontAt1x).toContain(`@${resolveLabelRasterScale(1)}#`);

    const pixelRatio = emulateDevicePixelRatio(game, 2);
    const fontAt2x = pool[0].font;

    expect(fontAt2x).toContain(`@${resolveLabelRasterScale(pixelRatio)}#`);
    expect(pool.every((label) => label.font === fontAt2x)).toBe(true);
    expect(labelsOf(game)).toHaveLength(DAMAGE_LABEL_POOL_SIZE);

    // A resize that keeps the ratio keeps the atlas.
    game.systems.scale.emit('resize');
    expect(pool[0].font).toBe(fontAt2x);
  });
});
