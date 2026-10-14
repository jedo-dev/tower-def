import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getRaceRegistry } from '../../../../entities/race-registry';
import { RaceId, TowerTypeId } from '../../../types/content-ids';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
  type GameSceneHarnessOptions,
} from '../test/sceneHarness';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR = { x: 8, y: 14 };
const MAX_FRAMES_PER_ROUND = 6000;

describe('GameScene scenarios (headless harness)', () => {
  let harness: GameSceneHarness | null = null;

  const start = async (options?: GameSceneHarnessOptions): Promise<GameSceneHarness> => {
    harness = await createGameSceneHarness(options);
    return harness;
  };

  beforeAll(async () => {
    // Loading the scene's module graph once keeps every scenario well under a second.
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  describe('send queue (regression: wiped on every build-phase frame)', () => {
    it('keeps a queued send through build-phase frames and spawns it on the opponent field', async () => {
      const game = await start();
      const [sentUnitId] = getRaceRegistry(RaceId.UNDEAD).sendableCreepIds;

      game.command('send-creep', { creepTypeId: sentUnitId });
      game.tick(180);

      expect(game.inspect().wavePhaseState.phase).toBe('build');
      expect(game.inspect().duelMatchState.player.sendQueue).toEqual([sentUnitId]);
      expect(game.latestHud().playerSendQueue).toHaveLength(1);
      expect(game.eventsOf('creep-send-rejected')).toEqual([]);

      game.command('start-wave', undefined);

      const sentSpawns = game
        .inspect()
        .pendingOpponentSpawns.filter((spawn) => spawn.sender === 'player');
      expect(sentSpawns.map((spawn) => spawn.unit.id)).toEqual([sentUnitId]);
      // Consumed by the wave start, not before.
      expect(game.inspect().duelMatchState.player.sendQueue).toEqual([]);
    });
  });

  describe('battlefield view (regression: opponent field rebuilt on every toggle)', () => {
    it('toggling the view keeps the live opponent creeps, towers and their cooldowns', async () => {
      const game = await start();
      game.command('start-wave', undefined);
      game.tickUntil(() => game.inspect().opponentField.creeps.length >= 2, MAX_FRAMES_PER_ROUND);
      game.tick(120);

      const field = game.inspect().opponentField;
      expect(field.towers.length).toBeGreaterThan(0);
      const creepsBefore = [...field.creeps];
      const towersBefore = [...field.towers];
      const towerRuntimesBefore = field.towers.map((tower) => tower.runtime);
      const countSprites = () =>
        game.createdObjects().filter((gameObject) => gameObject.kind === 'sprite').length;
      const spritesBefore = countSprites();

      for (let toggle = 0; toggle < 3; toggle += 1) {
        game.switchBattlefieldView('opponent');
        expect(game.inspect().activeBattlefieldView).toBe('opponent');
        game.switchBattlefieldView('player');
      }
      game.switchBattlefieldView('opponent');

      const fieldAfter = game.inspect().opponentField;
      expect(fieldAfter.creeps).toHaveLength(creepsBefore.length);
      fieldAfter.creeps.forEach((creep, index) => expect(creep).toBe(creepsBefore[index]));
      fieldAfter.towers.forEach((tower, index) => {
        expect(tower).toBe(towersBefore[index]);
        expect(tower.runtime).toBe(towerRuntimesBefore[index]);
      });
      expect(countSprites()).toBe(spritesBefore);
      expect(game.eventsOf('battlefield-view-changed').every((event) => event.accepted)).toBe(true);
      expect(fieldAfter.creeps.every((creep) => creep.sprite.visible)).toBe(true);
    });

    it('shows only the field in view', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      game.command('start-wave', undefined);
      game.tickUntil(() => game.inspect().opponentField.creeps.length > 0, MAX_FRAMES_PER_ROUND);

      game.switchBattlefieldView('opponent');
      game.tick();

      const { playerField, opponentField } = game.inspect();
      expect(playerField.towers.every((tower) => !tower.sprite.visible)).toBe(true);
      expect(opponentField.towers.every((tower) => tower.sprite.visible)).toBe(true);
    });
  });
});
