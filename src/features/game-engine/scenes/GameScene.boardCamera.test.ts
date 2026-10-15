import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { screenToWorldPoint } from '../runtime/camera/cameraViewMapping';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { BOARD_ZOOM_KEY_STEP_FACTOR, BOARD_ZOOM_MAX_FACTOR } from './gameScene.constants';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR: GridPosition = { x: 8, y: 14 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const VIEWPORT_CENTRE = { x: 195, y: 422 };

describe('GameScene board camera: pinch zoom and pan (tower-def-d9f.1)', () => {
  let harness: GameSceneHarness | null = null;

  const start = async (): Promise<GameSceneHarness> => {
    harness = await createGameSceneHarness();
    return harness;
  };

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  function towerCount(game: GameSceneHarness): number {
    return game.inspect().playerField.towers.length;
  }

  function zoomFactor(game: GameSceneHarness): number {
    return game.inspect().cameraZoomFactor;
  }

  describe('mouse wheel', () => {
    it('zooms around the cursor and keeps the world under it still', async () => {
      const game = await start();
      // Off-centre, but not so close to an edge that the scroll clamp bites.
      const cursor = { x: 120, y: 430 };
      const before = screenToWorldPoint(cursor, game.cameraView());

      game.wheelAt(cursor, -300);

      expect(zoomFactor(game)).toBeGreaterThan(1);
      const after = screenToWorldPoint(cursor, game.cameraView());
      expect(after.x).toBeCloseTo(before.x);
      expect(after.y).toBeCloseTo(before.y);
    });

    it('clamps the zoom between the fit view and the close-up limit', async () => {
      const game = await start();

      for (let notch = 0; notch < 20; notch += 1) game.wheelAt(VIEWPORT_CENTRE, -500);
      expect(zoomFactor(game)).toBeCloseTo(BOARD_ZOOM_MAX_FACTOR);

      for (let notch = 0; notch < 40; notch += 1) game.wheelAt(VIEWPORT_CENTRE, 500);
      expect(zoomFactor(game)).toBeCloseTo(1);
      expect(game.cameraView()).toEqual(game.inspect().cameraView);
    });
  });

  describe('touch', () => {
    it('pinches to zoom by the finger spread and places no tower', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });

      game.pinch(
        [
          { x: 170, y: 400 },
          { x: 220, y: 450 },
        ],
        [
          { x: 120, y: 350 },
          { x: 270, y: 500 },
        ],
      );

      expect(zoomFactor(game)).toBeCloseTo(3);
      expect(towerCount(game)).toBe(0);
    });

    it('pans with one finger once zoomed in, without building', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.wheelAt(VIEWPORT_CENTRE, -500);
      const before = game.cameraView();

      game.dragTouch({ x: 200, y: 400 }, { x: 140, y: 300 });

      const after = game.cameraView();
      expect(after.scrollX).toBeCloseTo(before.scrollX + 60 / before.zoom);
      expect(after.scrollY).toBeCloseTo(before.scrollY + 100 / before.zoom);
      expect(towerCount(game)).toBe(0);
      expect(game.eventsOf('build-rejected')).toEqual([]);
    });

    it('does not pan at fit zoom and does not count a drag as a tap', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      const before = game.cameraView();

      game.dragTouch({ x: 200, y: 400 }, { x: 140, y: 300 });

      expect(game.cameraView()).toEqual(before);
      expect(towerCount(game)).toBe(0);
    });

    it('builds the block under a tap after zooming and panning', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.wheelAt({ x: 60, y: 700 }, -600);
      game.dragTouch({ x: 300, y: 300 }, { x: 180, y: 220 });
      expect(zoomFactor(game)).toBeGreaterThan(1.5);

      // Two-tap confirmation (the touch default): the first tap arms the block.
      game.touchTapAt(game.anchorScreenPoint(MID_BOARD_ANCHOR));
      expect(game.inspect().pendingPlacementAnchor).toEqual(MID_BOARD_ANCHOR);
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(MID_BOARD_ANCHOR));

      expect(game.inspect().playerField.towers.map((tower) => tower.entity.position)).toEqual([
        MID_BOARD_ANCHOR,
      ]);
    });

    it('resets the zoom on a double tap that reaches the board outside building', async () => {
      const game = await start();
      game.wheelAt(VIEWPORT_CENTRE, -500);
      game.command('start-wave', undefined);
      expect(game.latestHud().phase).toBe('wave');
      const spot = { x: 200, y: 420 };

      game.touchTapAt(spot);
      expect(zoomFactor(game)).toBeGreaterThan(1);
      game.touchTapAt(spot);

      expect(zoomFactor(game)).toBeCloseTo(1);
    });

    it('keeps the zoom when a double tap is two build taps', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.wheelAt(VIEWPORT_CENTRE, -500);
      const spot = game.anchorScreenPoint(MID_BOARD_ANCHOR);

      game.touchTapAt(spot);
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(spot);

      expect(zoomFactor(game)).toBeGreaterThan(1);
    });
  });

  describe('mouse drag', () => {
    it('places on release when zoomed in, unless the press dragged (then it pans)', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.wheelAt(VIEWPORT_CENTRE, -500);
      const before = game.cameraView();

      game.dragMouse({ x: 200, y: 400 }, { x: 260, y: 440 });
      expect(towerCount(game)).toBe(0);
      expect(game.cameraView().scrollX).toBeCloseTo(before.scrollX - 60 / before.zoom);

      game.tick(ACTION_COOLDOWN_FRAMES);
      game.clickAt(game.anchorScreenPoint(MID_BOARD_ANCHOR));
      expect(game.inspect().playerField.towers.map((tower) => tower.entity.position)).toEqual([
        MID_BOARD_ANCHOR,
      ]);
    });

    it('pans with the middle button or Shift held and never builds from those', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      const spot = game.anchorScreenPoint(MID_BOARD_ANCHOR);

      game.dragMouse(spot, { x: spot.x + 40, y: spot.y + 40 }, { shiftKey: true });
      game.dragMouse(spot, { x: spot.x + 40, y: spot.y + 40 }, { button: 1 });

      expect(towerCount(game)).toBe(0);
      expect(game.eventsOf('build-rejected')).toEqual([]);
      // A plain click still builds at once at fit zoom.
      game.clickAt(spot);
      expect(towerCount(game)).toBe(1);
    });
  });

  describe('keyboard commands and views', () => {
    it('steps the zoom in and out from the typed command and resets to fit', async () => {
      const game = await start();

      game.command('zoom-board', { action: 'in' });
      expect(zoomFactor(game)).toBeCloseTo(BOARD_ZOOM_KEY_STEP_FACTOR);
      game.command('zoom-board', { action: 'in' });
      game.command('zoom-board', { action: 'out' });
      expect(zoomFactor(game)).toBeCloseTo(BOARD_ZOOM_KEY_STEP_FACTOR);
      game.command('zoom-board', { action: 'reset' });
      expect(zoomFactor(game)).toBeCloseTo(1);
    });

    it('zooms and pans the opponent view too', async () => {
      const game = await start();
      game.command('start-wave', undefined);
      game.switchBattlefieldView('opponent');

      game.pinch(
        [
          { x: 180, y: 400 },
          { x: 210, y: 430 },
        ],
        [
          { x: 150, y: 370 },
          { x: 240, y: 460 },
        ],
      );
      const zoomed = game.cameraView();
      game.dragTouch({ x: 200, y: 400 }, { x: 150, y: 400 });

      expect(zoomFactor(game)).toBeCloseTo(3);
      expect(game.cameraView().scrollX).toBeCloseTo(zoomed.scrollX + 50 / zoomed.zoom);
      expect(game.eventsOf('build-rejected')).toEqual([]);
    });

    it('keeps the zoom factor across a viewport resize', async () => {
      const game = await start();
      game.command('zoom-board', { action: 'in' });
      game.command('zoom-board', { action: 'in' });
      const factor = zoomFactor(game);

      game.systems.scale.width = 360;
      game.systems.scale.height = 800;
      game.systems.scale.emit('resize');

      expect(zoomFactor(game)).toBeCloseTo(factor);
      expect(game.cameraView().viewportWidth).toBe(360);
      expect(game.cameraView().viewportHeight).toBe(800);
    });
  });
});
