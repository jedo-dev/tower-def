import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { TOWER_VISUAL_SIZE } from '../../../shared/constants/sprites';
import { RACE_IDS, type RaceId } from '../../../shared/types/content-ids';
import type { GridPosition } from '../../../shared/types/pathfinding';
import { resolveTowerRenderDepth } from '../runtime/battlefield/actorRenderDepth';
import { getTowerVisualMetrics } from '../runtime/battlefield/towerVisualMetrics';
import type { FakeGameObject } from '../test/fakePhaser';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import { BUILD_PREVIEW_RENDER_DEPTH } from './gameScene.constants';

const CELL = 16;
/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;
/** Four towers on row 2, one more directly below the first: far from the side endpoints. */
const ROW_ANCHORS: readonly GridPosition[] = [
  { x: 2, y: 2 },
  { x: 6, y: 2 },
  { x: 10, y: 2 },
  { x: 14, y: 2 },
];
const BELOW_FIRST: GridPosition = { x: 2, y: 4 };
const EPSILON = 1e-6;

describe('GameScene tower scale and depth (tower-def-108)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  async function buildRaceRow(raceId: RaceId): Promise<GameSceneHarness> {
    harness = await createGameSceneHarness({
      setup: { ...HARNESS_DEFAULT_SETUP, builderFaction: raceId, endpoints: { mode: 'fixed' } },
    });
    const game = harness;
    game.setPlayerGold(100_000);
    const towers = getBuildableTowersByFaction(raceId);
    towers.forEach((tower, index) => {
      game.command('select-tower', { towerType: tower.towerType });
      game.tick(ACTION_COOLDOWN_FRAMES);
      game.clickBuildAnchor(ROW_ANCHORS[index]);
    });
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickBuildAnchor(BELOW_FIRST);
    return game;
  }

  function spriteAt(game: GameSceneHarness, anchor: GridPosition): FakeGameObject {
    const tower = game
      .inspect()
      .playerField.towers.find(
        (candidate) =>
          candidate.entity.position.x === anchor.x && candidate.entity.position.y === anchor.y,
      );
    if (!tower) throw new Error(`no tower at ${anchor.x},${anchor.y}`);
    return tower.sprite as unknown as FakeGameObject;
  }

  it.each(RACE_IDS)(
    'draws every %s tower within the size target, standing on its footprint',
    async (raceId) => {
      const game = await buildRaceRow(raceId);
      expect(game.inspect().playerField.towers).toHaveLength(ROW_ANCHORS.length + 1);

      for (const anchor of ROW_ANCHORS) {
        const sprite = spriteAt(game, anchor);
        const metrics = getTowerVisualMetrics(sprite.texture.key);

        // Bottom centre of the 2x2 footprint.
        expect(sprite.x).toBe((anchor.x + 1) * CELL);
        expect(sprite.y).toBe((anchor.y + 2) * CELL);
        expect(sprite.displayWidth).toBeCloseTo(metrics.displayWidthPx);
        expect(sprite.displayHeight).toBeCloseTo(metrics.displayHeightPx);
        expect(sprite.originX).toBeCloseTo(metrics.originX);
        expect(sprite.originY).toBeCloseTo(metrics.originY);
        expect(metrics.structureWidthPx).toBeLessThanOrEqual(
          TOWER_VISUAL_SIZE.targetWidthWorldPx + EPSILON,
        );
        expect(metrics.structureHeightPx).toBeLessThanOrEqual(
          TOWER_VISUAL_SIZE.maxHeightWorldPx + EPSILON,
        );
        // Larger than the 32px footprint it used to be squeezed into.
        expect(Math.max(metrics.structureWidthPx, metrics.structureHeightPx)).toBeGreaterThan(
          2 * CELL,
        );
        expect(sprite.depth).toBe(resolveTowerRenderDepth(anchor));
      }
    },
  );

  it('draws a tower directly below another over the upper one', async () => {
    const game = await buildRaceRow(HARNESS_DEFAULT_SETUP.builderFaction);

    expect(spriteAt(game, BELOW_FIRST).depth).toBeGreaterThan(spriteAt(game, ROW_ANCHORS[0]).depth);
  });

  it('keeps the build preview on the 2x2 footprint', async () => {
    const game = await buildRaceRow(HARNESS_DEFAULT_SETUP.builderFaction);
    const anchor = { x: 8, y: 20 };
    game.tick(ACTION_COOLDOWN_FRAMES);
    game.clickAt(game.anchorScreenPoint(anchor));

    const overlay = game
      .createdObjects()
      .find((object) => object.kind === 'graphics' && object.depth === BUILD_PREVIEW_RENDER_DEPTH);
    // The last preview drew the block itself, after the range circle.
    expect(overlay?.fillRects.at(-1) ?? null).toEqual({
      x: anchor.x * CELL,
      y: anchor.y * CELL,
      width: 2 * CELL,
      height: 2 * CELL,
    });
  });
});
