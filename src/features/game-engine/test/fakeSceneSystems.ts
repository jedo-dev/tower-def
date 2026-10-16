import { FakeEventEmitter, FakeObjectFactory } from './fakePhaser';

/**
 * Test-only Phaser scene systems (`scene.add`, `scene.time`, `scene.input`, ...)
 * plus the fake `Phaser` namespace that `vi.doMock('phaser')` hands to scene
 * code. Every system is plain state the harness can drive and read back.
 */

/** Portrait phone viewport from the AGENTS.md viewport checks. */
export const FAKE_VIEWPORT = { width: 390, height: 844 } as const;

/** Frames every fake sheet reports: enough for the directional 4-row contract. */
const FAKE_SHEET_FRAME_COUNT = 16;

type DelayedCall = { dueAtMs: number; callback: () => void };

export class FakeClock {
  public now = 0;
  /** Mirrors Phaser's Clock flags; the scene sets them with the game clock. */
  public paused = false;
  public timeScale = 1;
  private delayedCalls: DelayedCall[] = [];

  public delayedCall(delayMs: number, callback: () => void): { remove: () => void } {
    const entry: DelayedCall = { dueAtMs: this.now + delayMs, callback };
    this.delayedCalls.push(entry);
    return {
      remove: () => {
        this.delayedCalls = this.delayedCalls.filter((call) => call !== entry);
      },
    };
  }

  /** Moves the clock and runs the delayed calls that came due, oldest first. */
  public advanceTo(nowMs: number): void {
    this.now = nowMs;
    const due = this.delayedCalls.filter((call) => call.dueAtMs <= nowMs);
    this.delayedCalls = this.delayedCalls.filter((call) => call.dueAtMs > nowMs);
    due.forEach((call) => call.callback());
  }
}

export class FakeRegistry {
  public readonly values = new Map<string, unknown>();

  public set(key: string, value: unknown): this {
    this.values.set(key, value);
    return this;
  }

  public get(key: string): unknown {
    return this.values.get(key);
  }

  public has(key: string): boolean {
    return this.values.has(key);
  }

  public remove(key: string): this {
    this.values.delete(key);
    return this;
  }
}

export class FakeCamera {
  public x = 0;
  public y = 0;
  public width: number = FAKE_VIEWPORT.width;
  public height: number = FAKE_VIEWPORT.height;
  public zoom = 1;
  public scrollX = 0;
  public scrollY = 0;
  public roundPixels = false;

  public setViewport(x: number, y: number, width: number, height: number): this {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }

  public setZoom(zoom: number): this {
    this.zoom = zoom;
    return this;
  }

  public setScroll(scrollX: number, scrollY: number): this {
    this.scrollX = scrollX;
    this.scrollY = scrollY;
    return this;
  }

  public removeBounds(): this {
    return this;
  }

  public setBackgroundColor(): this {
    return this;
  }
}

class FakeScaleManager extends FakeEventEmitter {
  public width: number = FAKE_VIEWPORT.width;
  public height: number = FAKE_VIEWPORT.height;
  public dirty = false;
  public readonly canvasBounds = { left: 0, top: 0 };
  public readonly displayScale = { x: 1, y: 1 };
}

class FakeInputPlugin extends FakeEventEmitter {
  public readonly keyboard = new FakeEventEmitter();
  public readonly mouse = { disableContextMenu: (): void => undefined };
  /** Touch pointers the scene asked for beyond Phaser's default two. */
  public extraPointerCount = 0;

  public addPointer(quantity = 1): this {
    this.extraPointerCount += quantity;
    return this;
  }
}

class FakeTextureManager {
  public exists(): boolean {
    // Every texture "exists" so sprites resolve to their real keys and the
    // missing-art fallback (and its dev warnings) stays out of scene tests.
    return true;
  }

  public get(key: string) {
    return {
      key,
      getFrameNames: (): string[] =>
        Array.from({ length: FAKE_SHEET_FRAME_COUNT }, (_, index) => `${index}`),
      setFilter: (): void => undefined,
    };
  }

  public createCanvas(): null {
    return null;
  }
}

class FakeAnimationManager {
  public readonly keys = new Set<string>();
  public globalTimeScale = 1;
  public isPaused = false;

  public pauseAll(): void {
    this.isPaused = true;
  }

  public resumeAll(): void {
    this.isPaused = false;
  }

  public exists(key: string): boolean {
    return this.keys.has(key);
  }

  public create(config: { key: string }): void {
    this.keys.add(config.key);
  }

  public generateFrameNumbers(): unknown[] {
    return [];
  }
}

const NO_OP_PLUGIN = {
  add: (): void => undefined,
  once: (): void => undefined,
  on: (): void => undefined,
  unlock: (): void => undefined,
} as const;

export type FakeSceneSystems = {
  add: FakeObjectFactory;
  time: FakeClock;
  registry: FakeRegistry;
  events: FakeEventEmitter;
  input: FakeInputPlugin;
  scale: FakeScaleManager;
  cameras: { main: FakeCamera };
  textures: FakeTextureManager;
  anims: FakeAnimationManager;
  tweens: typeof NO_OP_PLUGIN;
  sound: typeof NO_OP_PLUGIN;
  load: typeof NO_OP_PLUGIN;
  game: {
    canvas: { getBoundingClientRect: () => { left: number; top: number } };
    loop: { actualFps: number };
  };
};

function createFakeSceneSystems(): FakeSceneSystems {
  const game = {
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
    loop: { actualFps: 60 },
  };
  return {
    add: new FakeObjectFactory(),
    time: new FakeClock(),
    registry: new FakeRegistry(),
    events: new FakeEventEmitter(),
    input: new FakeInputPlugin(),
    scale: new FakeScaleManager(),
    cameras: { main: new FakeCamera() },
    textures: new FakeTextureManager(),
    anims: new FakeAnimationManager(),
    tweens: NO_OP_PLUGIN,
    sound: NO_OP_PLUGIN,
    load: NO_OP_PLUGIN,
    game,
  };
}

const systemsByScene = new WeakMap<object, FakeSceneSystems>();

/** The fake systems behind a scene built on the fake `Phaser.Scene`. */
export function getFakeSceneSystems(scene: object): FakeSceneSystems {
  const systems = systemsByScene.get(scene);
  if (!systems) {
    throw new Error('Scene was not constructed with the fake Phaser module');
  }
  return systems;
}

class FakeScene {
  public readonly sys: { game: FakeSceneSystems['game'] };

  public constructor(_config?: unknown) {
    const systems = createFakeSceneSystems();
    systemsByScene.set(this, systems);
    Object.assign(this, systems);
    this.sys = { game: systems.game };
  }
}

type Rgb = { r: number; g: number; b: number };

// Mirrors Phaser 4's `RGBWithRGB`: channels are `Linear(from, to, index / length)`
// floats, left unrounded; `GetColor` truncates them when it packs the bits.
const interpolateChannel = (from: number, to: number, length: number, index: number): number =>
  (to - from) * (index / length) + from;

/** The slice of the `Phaser` namespace that the game's runtime code touches. */
export const fakePhaser = {
  AUTO: 0,
  Scene: FakeScene,
  Game: class FakeGame {},
  Scale: { RESIZE: 3, Events: { RESIZE: 'resize' } },
  Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  Loader: { Events: { COMPLETE: 'complete' } },
  Textures: { FilterMode: { LINEAR: 0, NEAREST: 1 } },
  Math: {
    Distance: {
      Between: (x1: number, y1: number, x2: number, y2: number): number =>
        Math.hypot(x2 - x1, y2 - y1),
    },
  },
  Display: {
    Color: {
      ValueToColor: (value: number): Rgb => ({
        r: (value >> 16) & 0xff,
        g: (value >> 8) & 0xff,
        b: value & 0xff,
      }),
      GetColor: (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b,
      Interpolate: {
        ColorWithColor: (from: Rgb, to: Rgb, length: number, index: number): Rgb => ({
          r: interpolateChannel(from.r, to.r, length, index),
          g: interpolateChannel(from.g, to.g, length, index),
          b: interpolateChannel(from.b, to.b, length, index),
        }),
      },
    },
  },
} as const;

export const fakePhaserModule = { default: fakePhaser };
