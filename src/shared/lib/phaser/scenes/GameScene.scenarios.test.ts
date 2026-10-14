import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { EnemyFaction } from '../../../../entities/enemy-faction';
import { getRaceRegistry } from '../../../../entities/race-registry';
import { RaceId, TowerTypeId } from '../../../types/content-ids';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
  type GameSceneHarnessOptions,
} from '../test/sceneHarness';
import { resolveBuildableTowerConfig } from './gameScene.helpers';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR = { x: 8, y: 14 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
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

  describe('smoke', () => {
    it('places a tower: spends gold, occupies the footprint and updates the HUD', async () => {
      const game = await start();
      const startingGold = game.inspect().playerGold;
      const towerCost = resolveBuildableTowerConfig(RaceId.UNDEAD, TowerTypeId.SINGLE)?.costGold;

      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.clickBuildAnchor(MID_BOARD_ANCHOR);

      const state = game.inspect();
      expect(state.playerField.towers).toHaveLength(1);
      expect(state.playerField.towers[0].entity.position).toEqual(MID_BOARD_ANCHOR);
      expect(state.playerGold).toBe(startingGold - (towerCost ?? Number.NaN));
      expect(game.latestHud().gold).toBe(state.playerGold);
      const anchorCell = state.gridModel?.cells.find(
        (cell) => cell.x === MID_BOARD_ANCHOR.x && cell.y === MID_BOARD_ANCHOR.y,
      );
      expect(anchorCell?.isOccupied).toBe(true);

      // The same spot is taken now: the second build is rejected and costs nothing.
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      expect(game.inspect().playerField.towers).toHaveLength(1);
      expect(game.inspect().playerGold).toBe(state.playerGold);
    });

    it('starts a wave: creeps spawn on both fields and the round resolves back to build', async () => {
      const game = await start();
      const waveNumberBefore = game.inspect().waveNumber;

      game.command('start-wave', undefined);

      expect(game.inspect().wavePhaseState.phase).toBe('wave');
      expect(game.inspect().waveNumber).toBe(waveNumberBefore + 1);
      expect(game.latestHud()).toMatchObject({ phase: 'wave', canStartWave: false });
      expect(game.inspect().pendingPlayerSpawns.length).toBeGreaterThan(0);

      game.tickUntil(() => game.inspect().playerField.creeps.length > 0, MAX_FRAMES_PER_ROUND);
      expect(game.inspect().opponentField.creeps.length).toBeGreaterThan(0);

      game.tickUntil(() => game.inspect().wavePhaseState.phase === 'build', MAX_FRAMES_PER_ROUND);
      expect(game.latestHud().canStartWave).toBe(true);
      // No player towers: every baseline creep leaked.
      expect(game.inspect().duelMatchState.player.hp).toBeLessThan(20);
    });

    it('loses the match when the player hp reaches 0', async () => {
      const game = await start({
        setup: { ...HARNESS_DEFAULT_SETUP, enemyFaction: EnemyFaction.ORC },
      });

      game.tickUntil(() => {
        if (game.latestHud().canStartWave) game.command('start-wave', undefined);
        return game.inspect().isGameOver;
      }, MAX_FRAMES_PER_ROUND * 5);

      expect(game.inspect().duelMatchState.player.hp).toBe(0);
      expect(game.latestHud()).toMatchObject({
        lives: 0,
        canStartWave: false,
        matchOutcome: { status: 'player-lost', winner: 'orc', reason: 'knockout' },
      });
      const outcomeSnapshots = game
        .hudSnapshots()
        .filter((snapshot) => snapshot.matchOutcome.status !== 'active');
      expect(outcomeSnapshots.length).toBeGreaterThan(0);

      // The run is over: commands no longer start waves.
      game.command('start-wave', undefined);
      game.tick(60);
      expect(game.inspect().wavePhaseState.phase).not.toBe('wave');
    });
  });
});
