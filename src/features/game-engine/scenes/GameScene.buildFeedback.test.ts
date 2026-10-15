import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getKillBountyGold } from '../../../entities/duel-match';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
  type GameSceneHarnessOptions,
} from '../test/sceneHarness';

/** A free 2x2 build spot in the middle of the 20x30 board. */
const MID_BOARD_ANCHOR: GridPosition = { x: 8, y: 14 };
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
const MAX_FRAMES_PER_ROUND = 6000;
/** Entrance on the left edge, exit on the right: a wall across columns 8..9 cuts the board. */
const FIXED_MAP_SETUP: GameSetupConfigLike = {
  ...HARNESS_DEFAULT_SETUP,
  endpoints: { mode: 'fixed' },
};

type GameSetupConfigLike = NonNullable<GameSceneHarnessOptions['setup']>;

describe('GameScene build feedback (tower-def-h28.4) and round summary (tower-def-h28.5)', () => {
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

  /** Walls columns 8..9 of the live grid except `gapRows` rows from row 10. */
  function wallBoardExceptGap(game: GameSceneHarness, gapRows: number): void {
    const grid = game.inspect().gridModel;
    if (!grid) throw new Error('grid not ready');
    for (const cell of grid.cells) {
      if ((cell.x === 8 || cell.x === 9) && (cell.y < 10 || cell.y >= 10 + gapRows)) {
        cell.isOccupied = true;
        cell.isWalkable = false;
      }
    }
  }

  function clickAfterCooldown(game: GameSceneHarness, anchor: GridPosition): void {
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickBuildAnchor(anchor);
  }

  /**
   * A row of archers just above the fixed map's straight route (row 14): one
   * archer gets two shots at a passing creep, six of them kill it.
   */
  function buildArcherRowAboveRoute(game: GameSceneHarness): void {
    game.command('select-tower', { towerType: TowerTypeId.SINGLE });
    for (let x = 2; x <= 12; x += 2) {
      clickAfterCooldown(game, { x, y: 11 });
    }
    expect(game.inspect().playerField.towers).toHaveLength(6);
    game.tick(ACTION_COOLDOWN_FRAMES);
  }

  describe('build-rejected is published once per refused tap, with the reason', () => {
    it('cells_occupied: a block overlapping a placed tower', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.clickBuildAnchor(MID_BOARD_ANCHOR);
      expect(game.inspect().playerField.towers).toHaveLength(1);

      clickAfterCooldown(game, { x: MID_BOARD_ANCHOR.x + 1, y: MID_BOARD_ANCHOR.y + 1 });

      expect(game.eventsOf('build-rejected')).toEqual([
        {
          reason: 'cells_occupied',
          towerType: TowerTypeId.SINGLE,
          anchor: { x: MID_BOARD_ANCHOR.x + 1, y: MID_BOARD_ANCHOR.y + 1 },
        },
      ]);
      expect(game.inspect().playerField.towers).toHaveLength(1);
    });

    it('insufficient_gold: the purse runs dry', async () => {
      const game = await start({ setup: FIXED_MAP_SETUP });
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      // Top rows, far from the centred entrance and exit zones: the route stays open.
      const freeAnchors: GridPosition[] = [];
      for (const y of [2, 4, 6]) {
        for (let x = 0; x <= 18; x += 2) freeAnchors.push({ x, y });
      }
      game.clickBuildAnchor(freeAnchors[0]);
      const towerCost = game.inspect().playerField.towers[0].entity.cost;
      let nextAnchorIndex = 1;
      while (game.inspect().playerGold >= towerCost) {
        clickAfterCooldown(game, freeAnchors[nextAnchorIndex]);
        nextAnchorIndex += 1;
      }
      expect(game.eventsOf('build-rejected')).toEqual([]);
      const anchor = freeAnchors[nextAnchorIndex];

      clickAfterCooldown(game, anchor);

      expect(game.eventsOf('build-rejected')).toEqual([
        { reason: 'insufficient_gold', towerType: TowerTypeId.SINGLE, anchor },
      ]);
    });

    it('path_blocked_small: the block seals the last two-cell gap', async () => {
      const game = await start({ setup: FIXED_MAP_SETUP });
      wallBoardExceptGap(game, 2);
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });

      clickAfterCooldown(game, { x: 8, y: 10 });

      expect(game.eventsOf('build-rejected')).toEqual([
        { reason: 'path_blocked_small', towerType: TowerTypeId.SINGLE, anchor: { x: 8, y: 10 } },
      ]);
      expect(game.inspect().playerField.towers).toHaveLength(0);
    });

    it('path_blocked_large: the block leaves a one-cell gap only small creeps fit', async () => {
      const game = await start({ setup: FIXED_MAP_SETUP });
      wallBoardExceptGap(game, 3);
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });

      clickAfterCooldown(game, { x: 8, y: 10 });

      expect(game.eventsOf('build-rejected')).toEqual([
        { reason: 'path_blocked_large', towerType: TowerTypeId.SINGLE, anchor: { x: 8, y: 10 } },
      ]);
      expect(game.inspect().playerField.towers).toHaveLength(0);
    });

    it('not_build_phase: a tap on a free cell during the wave', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });
      game.command('start-wave', undefined);
      expect(game.latestHud().phase).toBe('wave');

      clickAfterCooldown(game, MID_BOARD_ANCHOR);

      expect(game.eventsOf('build-rejected')).toEqual([
        { reason: 'not_build_phase', towerType: TowerTypeId.SINGLE, anchor: MID_BOARD_ANCHOR },
      ]);
      expect(game.inspect().playerField.towers).toHaveLength(0);
    });

    it('opponent_view: a tap while the enemy board is shown', async () => {
      const game = await start();
      game.command('start-wave', undefined);
      game.switchBattlefieldView('opponent');
      expect(game.inspect().activeBattlefieldView).toBe('opponent');

      clickAfterCooldown(game, MID_BOARD_ANCHOR);

      const rejections = game.eventsOf('build-rejected');
      expect(rejections).toHaveLength(1);
      expect(rejections[0]).toMatchObject({
        reason: 'opponent_view',
        towerType: TowerTypeId.SINGLE,
      });
      expect(game.inspect().playerField.towers).toHaveLength(0);
    });

    it('match_over: a tap after the match ended', async () => {
      const game = await start({
        setup: { ...HARNESS_DEFAULT_SETUP, enemyFaction: EnemyFaction.ORC },
      });
      game.tickUntil(() => {
        if (game.latestHud().canStartWave) game.command('start-wave', undefined);
        return game.inspect().isGameOver;
      }, MAX_FRAMES_PER_ROUND * 5);
      const rejectionsBefore = game.eventsOf('build-rejected').length;

      clickAfterCooldown(game, MID_BOARD_ANCHOR);

      expect(game.eventsOf('build-rejected').slice(rejectionsBefore)).toEqual([
        { reason: 'match_over', towerType: TowerTypeId.SINGLE, anchor: MID_BOARD_ANCHOR },
      ]);
    });

    it('a successful build publishes no rejection', async () => {
      const game = await start();
      game.command('select-tower', { towerType: TowerTypeId.SINGLE });

      game.clickBuildAnchor(MID_BOARD_ANCHOR);

      expect(game.inspect().playerField.towers).toHaveLength(1);
      expect(game.eventsOf('build-rejected')).toEqual([]);
    });
  });

  describe('round-settled summarises the player side once per round', () => {
    it('reports the leaks as lives lost, no bounty and the income paid when nothing is built', async () => {
      const game = await start();
      const incomeBefore = game.latestHud().income;
      const livesBefore = game.latestHud().lives;

      game.command('start-wave', undefined);
      game.tickUntil(() => game.latestHud().phase === 'build', MAX_FRAMES_PER_ROUND);

      const leaked = game
        .inspect()
        .playerField.creeps.filter((creep) => creep.entity.status === 'escaped').length;
      expect(leaked).toBeGreaterThan(0);
      const summaries = game.eventsOf('round-settled');
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({ round: 1, livesLost: leaked, bountyEarned: 0 });
      expect(summaries[0].incomePaid).toBeGreaterThanOrEqual(incomeBefore);
      // The lives line matches the summary once life steal is added back.
      const stolenByPlayer = game
        .eventsOf('lives-stolen')
        .filter((event) => event.thief === 'player')
        .reduce((sum, event) => sum + event.lives, 0);
      expect(game.latestHud().lives).toBe(livesBefore - summaries[0].livesLost + stolenByPlayer);
    });

    it('reports the kill bounty the towers earned and balances the purse', async () => {
      const game = await start({ setup: FIXED_MAP_SETUP });
      buildArcherRowAboveRoute(game);
      const goldAtWaveStart = game.inspect().playerGold;

      game.command('start-wave', undefined);
      game.tickUntil(() => game.latestHud().phase === 'build', MAX_FRAMES_PER_ROUND);

      const [summary, ...rest] = game.eventsOf('round-settled');
      expect(rest).toEqual([]);
      expect(summary.round).toBe(1);
      expect(summary.bountyEarned).toBeGreaterThan(0);
      expect(summary.bountyEarned % getKillBountyGold()).toBe(0);
      expect(game.inspect().playerGold - goldAtWaveStart).toBe(
        summary.bountyEarned + summary.incomePaid + ECONOMY_BALANCE.waveCompletionRewardGold,
      );
    });

    it('starts the bounty count afresh each wave', async () => {
      const game = await start({ setup: FIXED_MAP_SETUP });
      buildArcherRowAboveRoute(game);
      game.command('start-wave', undefined);
      game.tickUntil(() => game.latestHud().phase === 'build', MAX_FRAMES_PER_ROUND);
      const goldAtSecondWaveStart = game.inspect().playerGold;

      game.command('start-wave', undefined);
      game.tickUntil(() => game.latestHud().phase === 'build', MAX_FRAMES_PER_ROUND);

      const summaries = game.eventsOf('round-settled');
      expect(summaries.map((summary) => summary.round)).toEqual([1, 2]);
      expect(game.inspect().playerGold - goldAtSecondWaveStart).toBe(
        summaries[1].bountyEarned +
          summaries[1].incomePaid +
          ECONOMY_BALANCE.waveCompletionRewardGold,
      );
    });
  });
});
