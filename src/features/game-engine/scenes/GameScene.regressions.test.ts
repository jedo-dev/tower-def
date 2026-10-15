import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { TowerTypeId } from '../../../shared/types/content-ids';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
  type GameSceneHarnessOptions,
} from '../test/sceneHarness';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR = { x: 8, y: 14 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const MAX_FRAMES_PER_ROUND = 6000;

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

  describe('tower-def-1p7.6: one wave number across build, wave and outcome', () => {
    it('counts the wave being fought, and the next one while building', async () => {
      const game = await start();
      expect(game.latestHud()).toMatchObject({ phase: 'build', waveNumber: 1 });

      game.command('start-wave', undefined);
      expect(game.latestHud()).toMatchObject({ phase: 'wave', waveNumber: 1 });
      expect(game.inspect().waveNumber).toBe(1);

      game.tickUntil(() => game.latestHud().phase === 'build', MAX_FRAMES_PER_ROUND);
      expect(game.latestHud().waveNumber).toBe(2);

      game.command('start-wave', undefined);
      expect(game.latestHud()).toMatchObject({ phase: 'wave', waveNumber: 2 });
    });

    it('names the wave that ended the match in the outcome snapshot', async () => {
      const game = await start({
        setup: { ...HARNESS_DEFAULT_SETUP, enemyFaction: EnemyFaction.ORC },
      });
      let wavesStarted = 0;
      game.tickUntil(() => {
        if (game.latestHud().canStartWave) {
          game.command('start-wave', undefined);
          wavesStarted += 1;
        }
        return game.inspect().isGameOver;
      }, MAX_FRAMES_PER_ROUND * 5);

      expect(wavesStarted).toBeGreaterThan(0);
      expect(game.latestHud()).toMatchObject({
        phase: 'game-over',
        waveNumber: wavesStarted,
        matchOutcome: { status: 'player-lost' },
      });
    });
  });
});
