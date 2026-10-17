import Phaser from 'phaser';
import { MAX_CANVAS_PIXEL_RATIO } from '../../scenes/gameScene.constants';
import {
  computeCanvasResolution,
  isSameCanvasResolution,
  type CanvasResolution,
} from './canvasResolution';

/**
 * Owns the canvas backing-store size. Phaser 4 has no `resolution` option and
 * its RESIZE scale mode sizes the backing store to the CSS size, so on a DPR 3
 * phone the browser upscales a 1x bitmap. The game runs in scale mode NONE
 * instead: this runtime stretches the canvas over its host in CSS and resizes
 * the game to CSS size x pixel ratio whenever the host or the ratio changes.
 * `Phaser.Scale.Events.RESIZE` still fires on every change, so the responsive
 * camera re-fits exactly as before.
 */

type GameLike = Pick<Phaser.Game, 'scale' | 'canvas'>;

const resolutionByGame = new WeakMap<object, CanvasResolution>();

/** Measures a host element: its layout size and the device pixel ratio now. */
export function measureCanvasResolution(container: HTMLElement): CanvasResolution {
  const bounds = container.getBoundingClientRect();
  return computeCanvasResolution(
    bounds.width,
    bounds.height,
    window.devicePixelRatio,
    MAX_CANVAS_PIXEL_RATIO,
  );
}

/**
 * The resolution a game renders at. A game this runtime never sized (scene
 * tests) renders 1:1, its scale size being its CSS size.
 */
export function getCanvasResolution(
  game: object,
  scale: { width: number; height: number },
): CanvasResolution {
  const resolution = resolutionByGame.get(game);
  if (resolution) {
    return resolution;
  }
  return computeCanvasResolution(scale.width, scale.height, 1, 1);
}

/** Records a resolution for a game; exposed so scene tests can emulate a DPR. */
export function setCanvasResolution(game: object, resolution: CanvasResolution): void {
  resolutionByGame.set(game, resolution);
}

function stretchCanvasOverHost(canvas: HTMLCanvasElement): void {
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

/** Re-measures the host and resizes the game when anything changed. */
export function applyCanvasResolution(game: GameLike, container: HTMLElement): void {
  const next = measureCanvasResolution(container);
  const previous = resolutionByGame.get(game);
  if (previous && isSameCanvasResolution(previous, next)) {
    return;
  }

  // Stored before resizing: the RESIZE event handlers read it.
  resolutionByGame.set(game, next);
  stretchCanvasOverHost(game.canvas);
  game.scale.resize(next.backingWidth, next.backingHeight);
}

/**
 * Keeps the backing store matched to the host size and the device pixel
 * ratio (browser zoom, moving to another screen). Returns a teardown.
 */
export function registerCanvasResolution(game: GameLike, container: HTMLElement): () => void {
  const update = () => applyCanvasResolution(game, container);
  let pixelRatioQuery: MediaQueryList | null = null;

  const watchPixelRatio = () => {
    pixelRatioQuery?.removeEventListener('change', onPixelRatioChange);
    pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    pixelRatioQuery.addEventListener('change', onPixelRatioChange);
  };
  function onPixelRatioChange() {
    watchPixelRatio();
    update();
  }

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
  resizeObserver?.observe(container);
  window.addEventListener('resize', update);
  watchPixelRatio();
  update();

  return () => {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', update);
    pixelRatioQuery?.removeEventListener('change', onPixelRatioChange);
  };
}

/** Sizes the canvas once the game has booted and stops when it is destroyed. */
export function bindCanvasResolutionToGame(game: Phaser.Game, container: HTMLElement): void {
  const teardown = registerCanvasResolution(game, container);
  game.events.once(Phaser.Core.Events.DESTROY, teardown);
}
