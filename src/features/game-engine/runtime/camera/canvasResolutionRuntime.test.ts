import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { Core: { Events: { DESTROY: 'destroy' } } },
}));

const { applyCanvasResolution, getCanvasResolution, registerCanvasResolution } =
  await import('./canvasResolutionRuntime');

type Size = { width: number; height: number };

function createHost(initialSize: Size) {
  const host = {
    size: initialSize,
    getBoundingClientRect: () => ({ width: host.size.width, height: host.size.height }),
  };
  return host;
}

function createGame() {
  return {
    canvas: { style: {} as Record<string, string> },
    scale: { width: 0, height: 0, resize: vi.fn() },
  };
}

type Listener = () => void;

/** The window slice the runtime touches: DPR, resize and DPR-change listeners. */
function stubWindow(devicePixelRatio: number) {
  const resizeListeners = new Set<Listener>();
  const mediaListeners = new Set<Listener>();
  const fakeWindow = {
    devicePixelRatio,
    addEventListener: (_type: string, listener: Listener) => resizeListeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => resizeListeners.delete(listener),
    matchMedia: () => ({
      addEventListener: (_type: string, listener: Listener) => mediaListeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => mediaListeners.delete(listener),
    }),
  };
  vi.stubGlobal('window', fakeWindow);
  return { fakeWindow, resizeListeners, mediaListeners };
}

function stubResizeObserver() {
  const observers: { callback: Listener; disconnected: boolean }[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly record: { callback: Listener; disconnected: boolean };
      public constructor(callback: Listener) {
        this.record = { callback, disconnected: false };
        observers.push(this.record);
      }
      public observe(): void {}
      public disconnect(): void {
        this.record.disconnected = true;
      }
    },
  );
  return observers;
}

type RuntimeGame = Parameters<typeof applyCanvasResolution>[0];
const asGame = (game: ReturnType<typeof createGame>) => game as unknown as RuntimeGame;
const asHost = (host: ReturnType<typeof createHost>) => host as unknown as HTMLElement;

describe('canvas resolution runtime', () => {
  beforeEach(() => {
    stubWindow(3);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sizes the backing store to CSS x capped DPR and stretches the canvas in CSS', () => {
    const game = createGame();
    applyCanvasResolution(asGame(game), asHost(createHost({ width: 378, height: 439.625 })));

    expect(game.scale.resize).toHaveBeenCalledWith(945, 1099);
    expect(game.canvas.style).toMatchObject({ width: '100%', height: '100%', display: 'block' });
    expect(getCanvasResolution(game, game.scale)).toMatchObject({
      cssWidth: 378,
      cssHeight: 439.625,
      pixelRatio: 2.5,
    });
  });

  it('resizes only when the host size or the pixel ratio changed', () => {
    const { fakeWindow } = stubWindow(2);
    const game = createGame();
    const host = createHost({ width: 348, height: 396 });

    applyCanvasResolution(asGame(game), asHost(host));
    applyCanvasResolution(asGame(game), asHost(host));
    expect(game.scale.resize).toHaveBeenCalledTimes(1);
    expect(game.scale.resize).toHaveBeenLastCalledWith(696, 792);

    // Orientation change: the host swaps axes.
    host.size = { width: 800, height: 300 };
    applyCanvasResolution(asGame(game), asHost(host));
    expect(game.scale.resize).toHaveBeenLastCalledWith(1600, 600);

    // Browser zoom / another screen: same CSS size, new ratio.
    fakeWindow.devicePixelRatio = 1;
    applyCanvasResolution(asGame(game), asHost(host));
    expect(game.scale.resize).toHaveBeenLastCalledWith(800, 300);
    expect(game.scale.resize).toHaveBeenCalledTimes(3);
  });

  it('falls back to 1:1 for a game it never sized', () => {
    expect(getCanvasResolution({}, { width: 390, height: 844 })).toMatchObject({
      cssWidth: 390,
      cssHeight: 844,
      pixelRatio: 1,
    });
  });

  it('follows host resizes, window resizes and DPR changes until torn down', () => {
    const { fakeWindow, resizeListeners, mediaListeners } = stubWindow(2);
    const observers = stubResizeObserver();
    const game = createGame();
    const host = createHost({ width: 360, height: 500 });

    const teardown = registerCanvasResolution(asGame(game), asHost(host));
    expect(game.scale.resize).toHaveBeenLastCalledWith(720, 1000);

    host.size = { width: 390, height: 500 };
    observers[0].callback();
    expect(game.scale.resize).toHaveBeenLastCalledWith(780, 1000);

    fakeWindow.devicePixelRatio = 3;
    for (const listener of [...mediaListeners]) listener();
    expect(game.scale.resize).toHaveBeenLastCalledWith(975, 1250);

    host.size = { width: 400, height: 500 };
    for (const listener of [...resizeListeners]) listener();
    expect(game.scale.resize).toHaveBeenLastCalledWith(1000, 1250);

    teardown();
    expect(observers[0].disconnected).toBe(true);
    expect(resizeListeners.size).toBe(0);
    expect(mediaListeners.size).toBe(0);
  });
});
