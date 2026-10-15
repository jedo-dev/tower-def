import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { AUTO_WAVE_START_DELAY_MS } from './gameScene.constants';

const AUTO_START_SECONDS = AUTO_WAVE_START_DELAY_MS / 1000;
const MAX_FRAMES = 6000;
/** Enough frames for the wave to release several creeps and move them. */
const WAVE_PROGRESS_FRAMES = 240;

function creepPositions(game: GameSceneHarness): Array<{ x: number; y: number }> {
  return game.inspect().playerField.creeps.map((creep) => ({
    x: creep.sprite.x,
    y: creep.sprite.y,
  }));
}

function totalCreepTravel(game: GameSceneHarness): number {
  return game.inspect().playerField.creeps.reduce((sum, creep) => sum + creep.sprite.x, 0);
}

describe('GameScene match controls (tower-def-h28.1)', () => {
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

  describe('pause', () => {
    it('publishes the pause state and freezes the auto-start countdown', async () => {
      const game = await start();
      expect(game.latestHud()).toMatchObject({ isPaused: false, gameSpeed: 1 });
      game.tick(60 * 3);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 3);

      game.command('set-paused', { isPaused: true });
      expect(game.latestHud().isPaused).toBe(true);
      expect(game.systems.time.paused).toBe(true);
      expect(game.systems.anims.isPaused).toBe(true);

      game.tick(60 * 10);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 3);

      game.command('set-paused', { isPaused: false });
      expect(game.latestHud().isPaused).toBe(false);
      expect(game.systems.time.paused).toBe(false);
      game.tick(60 * 2);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 5);
    });

    it('stops creep movement and wave spawns while paused', async () => {
      const game = await start();
      game.command('start-wave', undefined);
      game.tickUntil(() => game.inspect().playerField.creeps.length > 0, MAX_FRAMES);
      game.tick(30);
      const pendingBefore = game.inspect().pendingPlayerSpawns.length;
      expect(pendingBefore).toBeGreaterThan(0);
      const positionsBefore = creepPositions(game);

      game.command('set-paused', { isPaused: true });
      game.tick(WAVE_PROGRESS_FRAMES);

      expect(game.inspect().pendingPlayerSpawns).toHaveLength(pendingBefore);
      expect(creepPositions(game)).toEqual(positionsBefore);

      game.command('set-paused', { isPaused: false });
      game.tick(WAVE_PROGRESS_FRAMES);
      expect(game.inspect().pendingPlayerSpawns.length).toBeLessThan(pendingBefore);
      expect(creepPositions(game)).not.toEqual(positionsBefore);
    });

    it('freezes the field when the player quits the match', async () => {
      const game = await start();
      game.command('quit-match', undefined);
      expect(game.latestHud().isPaused).toBe(true);
      game.tick(60 * 5);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS);
    });
  });

  describe('speed', () => {
    it('runs the countdown twice as fast per real millisecond at 2x', async () => {
      const game = await start();
      game.command('set-game-speed', { speed: 2 });
      expect(game.latestHud().gameSpeed).toBe(2);
      expect(game.systems.time.timeScale).toBe(2);
      expect(game.systems.anims.globalTimeScale).toBe(2);

      game.tick(60 * 4);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 8);

      game.command('set-game-speed', { speed: 1 });
      game.tick(60 * 4);
      expect(game.latestHud().autoStartSecondsLeft).toBe(AUTO_START_SECONDS - 12);
    });

    it('ignores speeds outside the supported set', async () => {
      const game = await start();
      game.command('set-game-speed', { speed: 4 as unknown as 2 });
      expect(game.latestHud().gameSpeed).toBe(1);
    });

    it('advances spawns and movement as far in half the real frames at 2x', async () => {
      const baseline = await start();
      baseline.command('start-wave', undefined);
      baseline.tick(WAVE_PROGRESS_FRAMES * 2);
      const baselinePending = baseline.inspect().pendingPlayerSpawns.length;
      const baselineTravel = totalCreepTravel(baseline);
      const baselineCreeps = baseline.inspect().playerField.creeps.length;
      baseline.destroy();

      const fast = await start();
      fast.command('set-game-speed', { speed: 2 });
      fast.command('start-wave', undefined);
      fast.tick(WAVE_PROGRESS_FRAMES);

      expect(fast.inspect().pendingPlayerSpawns).toHaveLength(baselinePending);
      expect(fast.inspect().playerField.creeps).toHaveLength(baselineCreeps);
      expect(totalCreepTravel(fast)).toBeCloseTo(baselineTravel, 3);
    });
  });
});
