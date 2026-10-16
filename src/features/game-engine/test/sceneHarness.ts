import { vi } from 'vitest';
import { BuilderFaction } from '../../../entities/builder-faction';
import { Difficulty } from '../../../entities/difficulty';
import { EnemyFaction } from '../../../entities/enemy-faction';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GridPosition } from '../../../shared/types/pathfinding';
import {
  clearGameSetupConfig,
  getGameHudSnapshot,
  onGameEvent,
  resetGameBridgeState,
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
import type { CameraView, ScreenPoint } from '../runtime/camera/cameraViewMapping';
import type { GameScene } from '../scenes/GameScene';
import type { GameSceneInspection } from '../scenes/gameScene.types';
import type { FakeGameObject } from './fakePhaser';
import { fakePhaserModule, getFakeSceneSystems, type FakeSceneSystems } from './fakeSceneSystems';
import {
  createPointerDispatcher,
  readCameraView,
  toAnchorScreenPoint,
  type MousePointerOptions,
} from './harnessPointers';

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
  'build-rejected': true,
  'round-settled': true,
  'engine-error': true,
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
  /** Canvas pixel at the centre of the tower block anchored at `anchor`, under the live camera. */
  anchorScreenPoint: (anchor: GridPosition) => ScreenPoint;
  /** The camera view the fake main camera was last set to. */
  cameraView: () => CameraView;
  /** Mouse: move, press and release at a canvas pixel. */
  clickAt: (screen: ScreenPoint, options?: MousePointerOptions) => void;
  /** Mouse: press at `from`, move through `steps` points to `to`, release. */
  dragMouse: (from: ScreenPoint, to: ScreenPoint, options?: MousePointerOptions) => void;
  /** Mouse wheel at a canvas pixel; `deltaY` positive zooms out. */
  wheelAt: (screen: ScreenPoint, deltaY: number) => void;
  /** Touch: one finger down and up at a canvas pixel. */
  touchTapAt: (screen: ScreenPoint, pointerId?: number) => void;
  /** Touch: one finger pressed at `from`, moved in steps to `to`, lifted. */
  dragTouch: (from: ScreenPoint, to: ScreenPoint, steps?: number) => void;
  /** Touch: two fingers pressed at `from`, moved in steps to `to`, lifted. */
  pinch: (from: [ScreenPoint, ScreenPoint], to: [ScreenPoint, ScreenPoint], steps?: number) => void;
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

  const pointers = createPointerDispatcher(systems);
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
    clickBuildAnchor: (anchor) => pointers.clickAt(toAnchorScreenPoint(systems, anchor)),
    anchorScreenPoint: (anchor) => toAnchorScreenPoint(systems, anchor),
    cameraView: () => readCameraView(systems),
    ...pointers,
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
      // The bridge is module-global; leave it where a new match starts.
      resetGameBridgeState();
    },
  };
}
