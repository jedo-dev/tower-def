import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
  type GameSceneHarnessOptions,
} from '../test/sceneHarness';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR = { x: 8, y: 14 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;

describe('GameScene regressions (QA audit tower-def-1p7)', () => {
  let harness: GameSceneHarness | null = null;

  const start = async (options?: GameSceneHarnessOptions): Promise<GameSceneHarness> => {
    harness = await createGameSceneHarness(options);
    return harness;
  };

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  describe('tower-def-1p7.1: the opponent view is read-only', () => {
    it('never selects the player tower under a tap and closes the panel on switching', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      expect(game.inspect().playerField.towers).toHaveLength(1);
      game.command('start-wave', undefined);
      game.tick(ACTION_COOLDOWN_FRAMES);

      // On the player's field the tower is inspectable during the wave.
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      const selectedOnPlayerView = game.eventsOf('selected-tower').at(-1);
      expect(selectedOnPlayerView?.tower?.position).toEqual(MID_BOARD_ANCHOR);

      game.switchBattlefieldView('opponent');
      expect(game.eventsOf('selected-tower').at(-1)).toEqual({ tower: null });

      const selectedEventsBefore = game.eventsOf('selected-tower').length;
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.clickBuildAnchor(MID_BOARD_ANCHOR);

      const selectedEventsAfter = game.eventsOf('selected-tower');
      expect(selectedEventsAfter.slice(selectedEventsBefore).every((e) => e.tower === null)).toBe(
        true,
      );
      expect(game.inspect().playerField.towers).toHaveLength(1);
    });

    it('ignores upgrade and sell commands while the opponent view is active', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      const towerId = game.inspect().playerField.towers[0].entity.id;
      game.command('start-wave', undefined);
      game.switchBattlefieldView('opponent');
      const goldBefore = game.inspect().playerGold;

      game.command('upgrade-tower', { towerId });
      game.command('sell-tower', { towerId });

      expect(game.inspect().playerField.towers).toHaveLength(1);
      expect(game.inspect().playerField.towers[0].entity.level).toBe(1);
      expect(game.inspect().playerGold).toBe(goldBefore);
    });
  });
});
