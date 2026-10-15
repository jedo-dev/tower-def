import { vi } from 'vitest';
import { BuilderFaction } from '../../../entities/builder-faction';
import { Difficulty } from '../../../entities/difficulty';
import { EnemyFaction } from '../../../entities/enemy-faction';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { TOWER_FOOTPRINT } from '../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  clearGameSetupConfig,
  getGameHudSnapshot,
  onGameEvent,
  requestBattlefieldView,
  sendGameCommand,
  setGameSetupConfig,
  subscribeGameHudSnapshot,
} from '../../../shared/lib/game-bridge/bridge';
import type {
  BattlefieldView,
  GameCommandMap,
  GameEventMap,
  GameHudSnapshot,
} from '../../../shared/lib/game-bridge/types';
import { worldToScreenPoint } from '../runtime/camera/cameraViewMapping';
import type { GameScene } from '../scenes/GameScene';
import type { GameSceneInspection } from '../scenes/gameScene.types';
import type { FakeGameObject } from './fakePhaser';
import { fakePhaserModule, getFakeSceneSystems, type FakeSceneSystems } from './fakeSceneSystems';

/**
 * Headless harness for the real GameScene. `phaser` is swapped for the fake
 * engine (fakePhaser/fakeSceneSystems), so create(), update() and the typed
 * bridge run exactly as in the game, minus rendering and audio (preload() is
 * skipped, so the scene has no sound manager).
 *
 * Usage: `const harness = await createGameSceneHarness();` in a node test,
 * `harness.destroy()` in afterEach. The bridge is module-global, so run one
 * harness at a time.
 */

/** 60 FPS frame, the performance target in AGENTS.md. */
export const HARNESS_FRAME_DELTA_MS = 1000 / 60;

export const HARNESS_DEFAULT_SETUP: GameSetupConfig = {
  builderFaction: BuilderFaction.UNDEAD,
  enemyFaction: EnemyFaction.UNDEAD,
  difficulty: Difficulty.NORMAL,
  // A seeded map keeps the baseline waves deterministic (a fixed map rolls Math.random).
  endpoints: { mode: 'dynamic', seed: 20261014 },
};

export type RecordedGameEvent = {
  [Name in keyof GameEventMap]: { name: Name; payload: GameEventMap[Name] };
}[keyof GameEventMap];

const GAME_EVENT_NAMES = Object.keys({
  'match-started': true,
  'selected-tower': true,
  'battlefield-view-changed': true,
  'creep-send-rejected': true,
  'send-queue-updated': true,
  'send-limits-updated': true,
  'income-updated': true,
  'opponent-hp-updated': true,
  'opponent-field-creeps-updated': true,
  'lives-stolen': true,
} satisfies Record<keyof GameEventMap, true>) as Array<keyof GameEventMap>;

export type GameSceneHarnessOptions = {
  setup?: GameSetupConfig;
  frameDeltaMs?: number;
};

export type GameSceneHarness = {
  scene: GameScene;
  systems: FakeSceneSystems;
  /** Live runtime state through the scene's inspection seam. */
  inspect: () => GameSceneInspection;
  /** Runs `frames` update ticks, advancing the fake clock by `deltaMs` each. */
  tick: (frames?: number, deltaMs?: number) => void;
  /** Ticks until `predicate` holds; throws after `maxFrames`. Returns the frames run. */
  tickUntil: (predicate: () => boolean, maxFrames: number, deltaMs?: number) => number;
  command: <Name extends keyof GameCommandMap>(name: Name, payload: GameCommandMap[Name]) => void;
  switchBattlefieldView: (view: BattlefieldView) => void;
  /** Left mouse click on the tile that anchors a tower footprint at `anchor`. */
  clickBuildAnchor: (anchor: GridPosition) => void;
  events: () => readonly RecordedGameEvent[];
  eventsOf: <Name extends keyof GameEventMap>(name: Name) => GameEventMap[Name][];
  hudSnapshots: () => readonly GameHudSnapshot[];
  latestHud: () => GameHudSnapshot;
  createdObjects: () => readonly FakeGameObject[];
  destroy: () => void;
};

async function loadGameSceneClass(): Promise<typeof GameScene> {
  vi.doMock('phaser', () => fakePhaserModule);
  const module = await import('../scenes/GameScene');
  return module.GameScene;
}

/**
 * Loads GameScene's module graph (the slow, one-off part) on the fake engine.
 * Call it from `beforeAll` so the first scenario does not pay for the import.
 */
export async function preloadGameScene(): Promise<void> {
  await loadGameSceneClass();
}

type PagePointerGlobals = { window?: unknown; document?: unknown };

/**
 * Pointer mapping reads the canvas' live page offset from `window`/`document`.
 * Node has neither, so a page at scroll 0 is provided for the dispatch only.
 */
function withPagePointerGlobals(run: () => void): void {
  const globals = globalThis as unknown as PagePointerGlobals;
  const missingWindow = globals.window === undefined;
  const missingDocument = globals.document === undefined;
  if (missingWindow) globals.window = { scrollX: 0, scrollY: 0 };
  if (missingDocument) globals.document = { documentElement: { clientLeft: 0, clientTop: 0 } };
  try {
    run();
  } finally {
    if (missingWindow) delete globals.window;
    if (missingDocument) delete globals.document;
  }
}

function toAnchorScreenPoint(systems: FakeSceneSystems, anchor: GridPosition) {
  const camera = systems.cameras.main;
  return worldToScreenPoint(
    {
      x: (anchor.x + TOWER_FOOTPRINT.width / 2) * GRID_DIMENSIONS.cellSize,
      y: (anchor.y + TOWER_FOOTPRINT.height / 2) * GRID_DIMENSIONS.cellSize,
    },
    {
      viewportX: camera.x,
      viewportY: camera.y,
      viewportWidth: camera.width,
      viewportHeight: camera.height,
      zoom: camera.zoom,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
    },
  );
}

function recordBridgeTraffic(events: RecordedGameEvent[], snapshots: GameHudSnapshot[]) {
  const unsubscribers = GAME_EVENT_NAMES.map((name) =>
    onGameEvent(name, (payload) => {
      events.push({ name, payload } as RecordedGameEvent);
    }),
  );
  unsubscribers.push(subscribeGameHudSnapshot(() => snapshots.push(getGameHudSnapshot())));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function createGameSceneHarness(
  options: GameSceneHarnessOptions = {},
): Promise<GameSceneHarness> {
  const GameSceneClass = await loadGameSceneClass();
  const frameDeltaMs = options.frameDeltaMs ?? HARNESS_FRAME_DELTA_MS;
  const events: RecordedGameEvent[] = [];
  const snapshots: GameHudSnapshot[] = [];
  const stopRecording = recordBridgeTraffic(events, snapshots);

  setGameSetupConfig(options.setup ?? HARNESS_DEFAULT_SETUP);
  const scene = new GameSceneClass();
  const systems = getFakeSceneSystems(scene);
  scene.create();

  const tick = (frames = 1, deltaMs = frameDeltaMs): void => {
    for (let frame = 0; frame < frames; frame += 1) {
      systems.time.advanceTo(systems.time.now + deltaMs);
      scene.update(systems.time.now, deltaMs);
    }
  };

  return {
    scene,
    systems,
    inspect: () => scene.inspectRuntimeState(),
    tick,
    tickUntil: (predicate, maxFrames, deltaMs = frameDeltaMs) => {
      for (let frame = 0; frame < maxFrames; frame += 1) {
        if (predicate()) return frame;
        tick(1, deltaMs);
      }
      if (predicate()) return maxFrames;
      throw new Error(`Condition not reached within ${maxFrames} frames`);
    },
    command: (name, payload) => sendGameCommand(name, payload),
    switchBattlefieldView: (view) => sendGameCommand('switch-battlefield-view', { view }),
    clickBuildAnchor: (anchor) => {
      const screen = toAnchorScreenPoint(systems, anchor);
      const pointer = { x: screen.x, y: screen.y, wasTouch: false, button: 0, primaryDown: true };
      withPagePointerGlobals(() => {
        systems.input.emit('pointermove', pointer);
        systems.input.emit('pointerdown', pointer);
        systems.input.emit('pointerup', pointer);
      });
    },
    events: () => events,
    eventsOf: <Name extends keyof GameEventMap>(name: Name) =>
      events
        .filter((event): event is Extract<RecordedGameEvent, { name: Name }> => event.name === name)
        .map((event) => event.payload as GameEventMap[Name]),
    hudSnapshots: () => snapshots,
    latestHud: () => getGameHudSnapshot(),
    createdObjects: () => systems.add.createdObjects,
    destroy: () => {
      systems.events.emit('shutdown');
      stopRecording();
      clearGameSetupConfig();
      // The bridge keeps the view across scenes; leave it where a new match starts.
      requestBattlefieldView('player');
    },
  };
}
