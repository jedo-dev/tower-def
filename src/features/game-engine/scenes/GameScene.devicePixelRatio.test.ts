import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { computeCanvasResolution } from '../runtime/camera/canvasResolution';
import { FAKE_VIEWPORT } from '../test/fakeSceneSystems';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { MAX_CANVAS_PIXEL_RATIO } from './gameScene.constants';

const MID_BOARD_ANCHOR: GridPosition = { x: 8, y: 14 };
const ACTION_COOLDOWN_FRAMES = 12;

type CanvasResolutionRuntime = typeof import('../runtime/camera/canvasResolutionRuntime');
/** Loaded after the harness mocks Phaser, so it is the instance the scene reads. */
let setCanvasResolution: CanvasResolutionRuntime['setCanvasResolution'];

/**
 * Puts the harness canvas at a device pixel ratio the way the canvas
 * resolution runtime does: the game (scale) size becomes the backing size,
 * Phaser reports pointers in backing pixels (displayScale = ratio), and a
 * scale RESIZE event follows. Harness pointer helpers take backing pixels,
 * exactly what `pointer.x/y` would be on a real DPR screen.
 */
function emulateDevicePixelRatio(game: GameSceneHarness, devicePixelRatio: number): number {
  const resolution = computeCanvasResolution(
    FAKE_VIEWPORT.width,
    FAKE_VIEWPORT.height,
    devicePixelRatio,
    MAX_CANVAS_PIXEL_RATIO,
  );
  const { scale } = game.systems;
  setCanvasResolution(game.systems.game, resolution);
  scale.width = resolution.backingWidth;
  scale.height = resolution.backingHeight;
  scale.displayScale.x = resolution.pixelRatio;
  scale.displayScale.y = resolution.pixelRatio;
  scale.emit('resize');
  return resolution.pixelRatio;
}

describe('GameScene on a high-DPR canvas (tower-def-vy8)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
    ({ setCanvasResolution } = await import('../runtime/camera/canvasResolutionRuntime'));
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  it.each([1, 2, 3])('fits the board in backing pixels at DPR %i', async (dpr) => {
    harness = await createGameSceneHarness();
    const fitZoomAt1x = harness.cameraView().zoom;
    const pixelRatio = emulateDevicePixelRatio(harness, dpr);

    const view = harness.cameraView();
    expect(view.viewportWidth).toBeCloseTo(FAKE_VIEWPORT.width * pixelRatio);
    expect(view.viewportHeight).toBeCloseTo(FAKE_VIEWPORT.height * pixelRatio);
    expect(view.zoom).toBeCloseTo(fitZoomAt1x * pixelRatio);
    expect(harness.inspect().cameraZoomFactor).toBeCloseTo(1);
  });

  it.each([1, 2, 3])(
    'builds the block under a two-tap placement after zoom and pan at DPR %i',
    async (dpr) => {
      const game = await createGameSceneHarness();
      harness = game;
      const pixelRatio = emulateDevicePixelRatio(game, dpr);
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.wheelAt({ x: 60 * pixelRatio, y: 700 * pixelRatio }, -600);
      game.dragTouch(
        { x: 300 * pixelRatio, y: 300 * pixelRatio },
        { x: 180 * pixelRatio, y: 220 * pixelRatio },
      );
      expect(game.inspect().cameraZoomFactor).toBeGreaterThan(1.5);

      game.touchTapAt(game.anchorScreenPoint(MID_BOARD_ANCHOR));
      expect(game.inspect().pendingPlacementAnchor).toEqual(MID_BOARD_ANCHOR);
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(MID_BOARD_ANCHOR));

      expect(game.inspect().playerField.towers.map((tower) => tower.entity.position)).toEqual([
        MID_BOARD_ANCHOR,
      ]);
    },
  );

  it('keeps tap and pan thresholds in CSS pixels on a DPR 3 screen', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    const pixelRatio = emulateDevicePixelRatio(game, 3);
    game.command('zoom-board', { action: 'in' });
    game.command('zoom-board', { action: 'in' });
    const before = game.cameraView();

    // 8 CSS px of jitter is 20 backing px: still a tap, so the camera stays.
    game.dragTouch(
      { x: 200 * pixelRatio, y: 400 * pixelRatio },
      { x: 208 * pixelRatio, y: 400 * pixelRatio },
    );
    expect(game.cameraView()).toEqual(before);
  });

  it('keeps the zoom factor across a resize at DPR 3', async () => {
    const game = await createGameSceneHarness();
    harness = game;
    emulateDevicePixelRatio(game, 3);
    game.command('zoom-board', { action: 'in' });
    const factor = game.inspect().cameraZoomFactor;

    const rotated = computeCanvasResolution(844, 390, 3, MAX_CANVAS_PIXEL_RATIO);
    setCanvasResolution(game.systems.game, rotated);
    game.systems.scale.width = rotated.backingWidth;
    game.systems.scale.height = rotated.backingHeight;
    game.systems.scale.emit('resize');

    expect(game.inspect().cameraZoomFactor).toBeCloseTo(factor);
    expect(game.cameraView().viewportWidth).toBeCloseTo(rotated.backingWidth);
    expect(game.cameraView().viewportHeight).toBeCloseTo(rotated.backingHeight);
  });
});
