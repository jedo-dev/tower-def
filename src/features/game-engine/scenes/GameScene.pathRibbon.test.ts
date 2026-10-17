import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TowerTypeId } from '../../../shared/types/content-ids';
import type { GridPoint } from '../../../shared/types/grid';
import {
  createGameSceneHarness,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';

/** Longer than the scene's 160 ms action cooldown. */
const ACTION_COOLDOWN_FRAMES = 12;

/** The route cells encoded in the ribbon's signature (`texture|x:y|x:y...`). */
function readShownRoute(game: GameSceneHarness): GridPoint[] {
  const signature = game.inspect().gridRenderer.pathRibbon.signature ?? '';
  return signature
    .split('|')
    .slice(1)
    .map((cell) => {
      const [x, y] = cell.split(':').map(Number);
      return { x, y };
    });
}

const rebuildCount = (game: GameSceneHarness): number =>
  game.inspect().gridRenderer.pathRibbon.rebuildCount;

describe('GameScene path ribbon (tower-def-bpf)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  it('builds the trail once for the opening route and never on a plain tick', async () => {
    harness = await createGameSceneHarness();
    const game = harness;

    expect(readShownRoute(game).length).toBeGreaterThan(1);
    expect(rebuildCount(game)).toBe(1);

    game.tick(120);

    expect(rebuildCount(game)).toBe(1);
    // Route cells keep the ground tile; only the ribbon shows the path texture.
    const terrainKeys = game.inspect().gridRenderer.terrainSprites.map((s) => s.texture.key);
    expect(terrainKeys.some((key) => key.endsWith('/path.png'))).toBe(false);
  });

  it('rebuilds exactly once when a build changes the route, and not when it does not', async () => {
    harness = await createGameSceneHarness();
    const game = harness;
    const route = readShownRoute(game);
    game.command('select-tower', { towerType: TowerTypeId.SINGLE });

    // Off the route: the trail stays as it was.
    const routeKeys = new Set(route.map((cell) => `${cell.x}:${cell.y}`));
    const grid = game.inspect().gridModel;
    const offRouteAnchor = grid?.cells.find(
      (cell) =>
        cell.x % 2 === 0 &&
        cell.y % 2 === 0 &&
        cell.role === 'empty' &&
        [0, 1].every((dx) =>
          [0, 1].every(
            (dy) =>
              !routeKeys.has(`${cell.x + dx}:${cell.y + dy}`) &&
              !routeKeys.has(`${cell.x + dx + 1}:${cell.y + dy}`) &&
              !routeKeys.has(`${cell.x + dx - 1}:${cell.y + dy}`),
          ),
        ),
    );
    expect(offRouteAnchor).toBeDefined();
    if (!offRouteAnchor) return;
    game.clickBuildAnchor(offRouteAnchor);
    game.tick(ACTION_COOLDOWN_FRAMES);
    expect(game.inspect().playerField.towers).toHaveLength(1);
    expect(readShownRoute(game)).toEqual(route);
    expect(rebuildCount(game)).toBe(1);

    // On the route, mid-way: creeps must walk around it.
    const middle = route[Math.floor(route.length / 2)];
    game.clickBuildAnchor({ x: middle.x - (middle.x % 2), y: middle.y - (middle.y % 2) });
    game.tick(ACTION_COOLDOWN_FRAMES);
    expect(game.inspect().playerField.towers).toHaveLength(2);
    expect(readShownRoute(game)).not.toEqual(route);
    expect(rebuildCount(game)).toBe(2);

    game.tick(120);
    expect(rebuildCount(game)).toBe(2);
  });

  it('keeps the trail through wave start and shows the player route again after the enemy view', async () => {
    harness = await createGameSceneHarness();
    const game = harness;
    const route = readShownRoute(game);

    game.command('start-wave', undefined);
    game.tick(60);
    // The wave walks the route the board already showed: nothing to rebuild.
    expect(readShownRoute(game)).toEqual(route);
    expect(rebuildCount(game)).toBe(1);

    game.switchBattlefieldView('opponent');
    const afterOpponent = rebuildCount(game);
    game.switchBattlefieldView('player');

    expect(readShownRoute(game)).toEqual(route);
    expect(rebuildCount(game)).toBeLessThanOrEqual(afterOpponent + 1);
  });
});
