import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import {
  resetControlSettingsForTests,
  setControlSettings,
} from '../../../shared/lib/control-settings/controlSettingsStore';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { BUILD_PREVIEW_RENDER_DEPTH } from './gameScene.constants';

/** Free 2x2 build spots in the middle of the 20x30 board. */
const FIRST_ANCHOR: GridPosition = { x: 8, y: 14 };
const SECOND_ANCHOR: GridPosition = { x: 12, y: 18 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const CELL = GRID_DIMENSIONS.cellSize;

describe('GameScene two-tap placement confirmation (tower-def-d9f.2)', () => {
  let harness: GameSceneHarness | null = null;

  const start = async (): Promise<GameSceneHarness> => {
    harness = await createGameSceneHarness();
    harness.command('select-tower', { towerType: TowerTypeId.SINGLE });
    return harness;
  };

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
    resetControlSettingsForTests();
  });

  function towerAnchors(game: GameSceneHarness): GridPosition[] {
    return game.inspect().playerField.towers.map((tower) => tower.entity.position);
  }

  /** The block rectangle the build preview overlay last drew, in cells. */
  function previewBlock(game: GameSceneHarness): GridPosition | null {
    const overlay = game
      .createdObjects()
      .find((object) => object.kind === 'graphics' && object.depth === BUILD_PREVIEW_RENDER_DEPTH);
    const rect = overlay?.fillRects.at(-1);
    return rect ? { x: rect.x / CELL, y: rect.y / CELL } : null;
  }

  describe('touch with the confirmation on (default)', () => {
    it('previews on the first tap and builds on the second tap on the same block', async () => {
      const game = await start();

      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));

      expect(towerAnchors(game)).toEqual([]);
      expect(game.inspect().pendingPlacementAnchor).toEqual(FIRST_ANCHOR);
      expect(previewBlock(game)).toEqual(FIRST_ANCHOR);
      expect(game.eventsOf('build-rejected')).toEqual([]);

      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));

      expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
      expect(game.inspect().pendingPlacementAnchor).toBeNull();
      // No stale preview is left on the new tower under the lifted finger.
      expect(previewBlock(game)).toBeNull();
    });

    it('moves the preview when the second tap lands elsewhere', async () => {
      const game = await start();

      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(SECOND_ANCHOR));

      expect(towerAnchors(game)).toEqual([]);
      expect(game.inspect().pendingPlacementAnchor).toEqual(SECOND_ANCHOR);
      expect(previewBlock(game)).toEqual(SECOND_ANCHOR);
    });

    it('keeps an invalid block armed and reports the refusal on its confirming tap', async () => {
      const game = await start();
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
      const overlapping = { x: FIRST_ANCHOR.x + 1, y: FIRST_ANCHOR.y + 1 };

      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(overlapping));
      expect(game.eventsOf('build-rejected')).toEqual([]);
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(overlapping));

      expect(game.eventsOf('build-rejected')).toEqual([
        { reason: 'cells_occupied', towerType: TowerTypeId.SINGLE, anchor: overlapping },
      ]);
      expect(game.inspect().pendingPlacementAnchor).toEqual(overlapping);
      expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
    });

    it('keeps the armed block through a pan and builds it on the confirming tap', async () => {
      const game = await start();
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      game.command('zoom-board', { action: 'in' });
      game.command('zoom-board', { action: 'in' });

      game.dragTouch({ x: 200, y: 400 }, { x: 150, y: 340 });
      expect(game.inspect().pendingPlacementAnchor).toEqual(FIRST_ANCHOR);
      expect(previewBlock(game)).toEqual(FIRST_ANCHOR);

      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
    });

    it('drops the armed block when a tap selects a built tower', async () => {
      const game = await start();
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(SECOND_ANCHOR));
      expect(game.inspect().pendingPlacementAnchor).toEqual(SECOND_ANCHOR);

      game.tick(ACTION_COOLDOWN_FRAMES);
      game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));

      expect(game.inspect().pendingPlacementAnchor).toBeNull();
      expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
    });
  });

  it('builds on a single touch tap with the confirmation off', async () => {
    setControlSettings({ confirmPlacementWithSecondTap: false });
    const game = await start();

    game.touchTapAt(game.anchorScreenPoint(FIRST_ANCHOR));

    expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
    expect(game.inspect().pendingPlacementAnchor).toBeNull();
  });

  it('keeps hover preview and single click on the mouse, whatever the setting', async () => {
    const game = await start();

    game.clickAt(game.anchorScreenPoint(FIRST_ANCHOR));
    expect(towerAnchors(game)).toEqual([FIRST_ANCHOR]);
    expect(game.inspect().pendingPlacementAnchor).toBeNull();

    // A mouse move after a touch-armed block hands the preview back to the cursor.
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.touchTapAt(game.anchorScreenPoint(SECOND_ANCHOR));
    expect(game.inspect().pendingPlacementAnchor).toEqual(SECOND_ANCHOR);
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickAt(game.anchorScreenPoint({ x: 2, y: 2 }));
    expect(game.inspect().pendingPlacementAnchor).toBeNull();
    expect(towerAnchors(game)).toEqual([FIRST_ANCHOR, { x: 2, y: 2 }]);
  });
});
