import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BuilderFaction } from '../../../entities/builder-faction';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import { TERRAIN_GATE_ASSETS } from '../../../shared/constants/terrain';
import { generateEdgeEndpoints } from '../../../shared/lib/grid/generateEdgeEndpoints';
import { RaceId } from '../../../shared/types/content-ids';
import { ENDPOINT_GATE_OBJECT_NAME } from '../runtime/grid/endpointGates';
import type { FakeGameObject } from '../test/fakePhaser';
import {
  createGameSceneHarness,
  HARNESS_DEFAULT_SETUP,
  preloadGameScene,
  type GameSceneHarness,
} from '../test/sceneHarness';
import {
  CREEP_RENDER_DEPTH,
  PATH_RIBBON_RENDER_DEPTH,
  TOWER_RENDER_DEPTH,
} from './gameScene.constants';

type GateView = {
  edge: unknown;
  raceId: unknown;
  frame: unknown;
  textureKey: string;
  sheetFrame: string | number | null;
};

function findGate(game: GameSceneHarness, role: 'entrance' | 'exit'): FakeGameObject {
  const gates = game
    .createdObjects()
    .filter((object) => !object.isDestroyed && object.name === ENDPOINT_GATE_OBJECT_NAME[role]);
  expect(gates).toHaveLength(1);
  return gates[0];
}

function readGate(game: GameSceneHarness, role: 'entrance' | 'exit'): GateView {
  const gate = findGate(game, role);
  expect(gate.getData('gateRole')).toBe(role);
  return {
    edge: gate.getData('gateEdge'),
    raceId: gate.getData('gateRaceId'),
    frame: gate.getData('gateFrame'),
    textureKey: gate.texture.key,
    sheetFrame: gate.frameName,
  };
}

/** A seed whose entrance sits on the top edge and exit on the bottom edge, off the corners. */
function findTopToBottomSeed(): number {
  const lastAnchorX = GRID_DIMENSIONS.cols - 2;
  for (let seed = 1; seed < 5000; seed += 1) {
    const { entrance, exit } = generateEdgeEndpoints(seed);
    const isTop = entrance.y === 0 && entrance.x > 0 && entrance.x < lastAnchorX;
    const isBottom = exit.y === GRID_DIMENSIONS.rows - 2 && exit.x > 0 && exit.x < lastAnchorX;
    if (isTop && isBottom) {
      return seed;
    }
  }
  throw new Error('no top-to-bottom seed found');
}

describe('GameScene faction gates (tower-def-alq)', () => {
  let harness: GameSceneHarness | null = null;

  beforeAll(async () => {
    await preloadGameScene();
  });

  afterEach(() => {
    harness?.destroy();
    harness = null;
  });

  async function start(endpoints: (typeof HARNESS_DEFAULT_SETUP)['endpoints']) {
    harness = await createGameSceneHarness({
      setup: {
        ...HARNESS_DEFAULT_SETUP,
        builderFaction: BuilderFaction.ORC,
        enemyFaction: EnemyFaction.ELF,
        endpoints,
      },
    });
    return harness;
  }

  it("stands the player's race gates on the classic left-to-right lane", async () => {
    const game = await start({ mode: 'fixed' });
    const orcSheet = TERRAIN_GATE_ASSETS[RaceId.ORC].key;

    expect(readGate(game, 'entrance')).toEqual({
      edge: 'left',
      raceId: RaceId.ORC,
      frame: 3,
      textureKey: orcSheet,
      sheetFrame: 3,
    });
    expect(readGate(game, 'exit')).toEqual({
      edge: 'right',
      raceId: RaceId.ORC,
      frame: 5,
      textureKey: orcSheet,
      sheetFrame: 5,
    });
    const entrance = findGate(game, 'entrance');
    expect(entrance.displayWidth).toBe(32);
    expect(entrance.displayHeight).toBe(32);
    expect(entrance.depth).toBeGreaterThan(PATH_RIBBON_RENDER_DEPTH);
    expect(entrance.depth).toBeLessThan(Math.min(TOWER_RENDER_DEPTH, CREEP_RENDER_DEPTH));
  });

  it('stands its base on the lower edge of the 2x2 entrance zone', async () => {
    const game = await start({ mode: 'fixed' });
    const anchor = game.inspect().gridModel?.entrance;
    const gate = findGate(game, 'entrance');

    expect(anchor).toBeDefined();
    if (!anchor) return;
    expect(gate.x).toBe((anchor.x + 1) * GRID_DIMENSIONS.cellSize);
    expect(gate.y).toBe((anchor.y + 2) * GRID_DIMENSIONS.cellSize);
  });

  it('uses the top and bottom frames on a dynamic top-to-bottom lane', async () => {
    const game = await start({ mode: 'dynamic', seed: findTopToBottomSeed() });

    expect(readGate(game, 'entrance')).toMatchObject({ edge: 'top', frame: 0, sheetFrame: 0 });
    expect(readGate(game, 'exit')).toMatchObject({ edge: 'bottom', frame: 6, sheetFrame: 6 });
  });

  it("re-textures the same gates to the opponent's race on the enemy view and back", async () => {
    const game = await start({ mode: 'fixed' });
    const entrance = findGate(game, 'entrance');
    const exit = findGate(game, 'exit');
    game.command('start-wave', undefined);

    game.switchBattlefieldView('opponent');
    expect(findGate(game, 'entrance')).toBe(entrance);
    expect(findGate(game, 'exit')).toBe(exit);
    expect(readGate(game, 'entrance')).toMatchObject({
      raceId: RaceId.ELF,
      textureKey: TERRAIN_GATE_ASSETS[RaceId.ELF].key,
      frame: 3,
    });
    expect(readGate(game, 'exit').textureKey).toBe(TERRAIN_GATE_ASSETS[RaceId.ELF].key);

    game.switchBattlefieldView('player');
    expect(readGate(game, 'entrance').textureKey).toBe(TERRAIN_GATE_ASSETS[RaceId.ORC].key);
  });

  it('does not touch the gates on plain ticks, in build or in a wave', async () => {
    const game = await start({ mode: 'fixed' });
    const gates = game.inspect().gridRenderer.endpointGates;
    const before = gates.updateCount;

    game.tick(120);
    game.command('start-wave', undefined);
    game.tick(120);

    expect(gates.updateCount).toBe(before);
  });

  it('releases the gates on scene shutdown', async () => {
    const game = await start({ mode: 'fixed' });
    const gates = [findGate(game, 'entrance'), findGate(game, 'exit')];

    game.destroy();
    harness = null;

    expect(gates.every((gate) => gate.isDestroyed)).toBe(true);
  });
});
