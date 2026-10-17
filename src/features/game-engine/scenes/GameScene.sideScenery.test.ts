import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BuilderFaction } from '../../../entities/builder-faction';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { TERRAIN_SIDE_SCENERY_ASSETS } from '../../../shared/constants/terrain';
import { RaceId, TowerTypeId } from '../../../shared/types/content-ids';
import type { FakeGameObject } from '../test/fakePhaser';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { TERRAIN_RENDER_DEPTH } from './gameScene.constants';

const SIDE_SCENERY_KEYS = new Set(
  Object.values(TERRAIN_SIDE_SCENERY_ASSETS).flatMap((strips) => [
    strips.left.key,
    strips.right.key,
  ]),
);

/** Strips are created once and re-textured, so match them by any side-scenery key. */
function sideStrips(game: GameSceneHarness): FakeGameObject[] {
  return game
    .createdObjects()
    .filter(
      (object) =>
        object.kind === 'image' && !object.isDestroyed && SIDE_SCENERY_KEYS.has(object.texture.key),
    );
}

function stripKeys(game: GameSceneHarness): string[] {
  return sideStrips(game).map((strip) => strip.texture.key);
}

describe('GameScene board side scenery (tower-def-jsl)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  async function start(): Promise<GameSceneHarness> {
    harness = await createGameSceneHarness({
      setup: {
        ...HARNESS_DEFAULT_SETUP,
        builderFaction: BuilderFaction.ORC,
        enemyFaction: EnemyFaction.ELF,
      },
    });
    return harness;
  }

  it("frames the player's board with the player's race, below the ground tiles", async () => {
    const game = await start();

    expect(stripKeys(game)).toEqual([
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ORC].left.key,
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ORC].right.key,
    ]);
    for (const strip of sideStrips(game)) {
      expect(strip.depth).toBeLessThan(TERRAIN_RENDER_DEPTH);
    }
  });

  it("swaps the same two strips to the opponent's race on the enemy view and back", async () => {
    const game = await start();
    const [left, right] = sideStrips(game);
    game.command('start-wave', undefined);

    game.switchBattlefieldView('opponent');
    expect(sideStrips(game)).toEqual([left, right]);
    expect(stripKeys(game)).toEqual([
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ELF].left.key,
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ELF].right.key,
    ]);

    game.switchBattlefieldView('player');
    expect(stripKeys(game)).toEqual([
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ORC].left.key,
      TERRAIN_SIDE_SCENERY_ASSETS[RaceId.ORC].right.key,
    ]);
  });

  it('leaves board taps to the grid: a tower is still placed', async () => {
    const game = await start();
    game.command('select-tower', { towerType: TowerTypeId.SINGLE });

    game.clickBuildAnchor({ x: 8, y: 14 });

    expect(game.inspect().playerField.towers).toHaveLength(1);
  });

  it('releases the strips on scene shutdown', async () => {
    const game = await start();
    const strips = sideStrips(game);

    game.destroy();
    harness = null;

    expect(strips.every((strip) => strip.isDestroyed)).toBe(true);
  });
});
