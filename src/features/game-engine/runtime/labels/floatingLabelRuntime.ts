import Phaser from 'phaser';
import { DAMAGE_LABEL_FONT_LOAD_QUERY } from '../../scenes/floatingLabel.constants';
import { getCanvasResolution } from '../camera/canvasResolutionRuntime';
import {
  installDamageLabelFont,
  removeDamageLabelFont,
  toDamageLabelFontKey,
} from './damageLabelFont';
import {
  fillFloatingLabelPool,
  setFloatingLabelFont,
  type FloatingLabelPool,
} from './floatingLabelPool';
import { resolveLabelRasterScale } from './labelRasterScale';

/**
 * Keeps in-world labels at the canvas resolution. On create it installs the
 * damage label font for the current pixel ratio and fills the label pool; on
 * every scale RESIZE (host resize or DPR change, see canvasResolutionRuntime)
 * it re-resolves the raster scale and, only when that changed, installs a new
 * atlas, re-points the pooled labels at it and drops the old one.
 * `onRasterScaleChanged` lets plain Text labels (effect pips) follow along.
 * Returns a teardown.
 */
export type FloatingLabelRuntimeOptions = {
  scene: Phaser.Scene;
  pool: FloatingLabelPool;
  onRasterScaleChanged: (rasterScale: number) => void;
  /** Resolves when the label web font is ready; absent outside a browser. */
  whenFontReady?: () => Promise<unknown>;
};

export type FloatingLabelRuntimeState = {
  rasterScale: number;
  generation: number;
};

/** The raster scale labels should use for a scene right now. */
export function readSceneLabelRasterScale(scene: Phaser.Scene): number {
  return resolveLabelRasterScale(getCanvasResolution(scene.game, scene.scale).pixelRatio);
}

function defaultWhenFontReady(): Promise<unknown> | undefined {
  if (typeof document === 'undefined' || !document.fonts) {
    return undefined;
  }
  if (document.fonts.check(DAMAGE_LABEL_FONT_LOAD_QUERY)) {
    return undefined;
  }
  return document.fonts.load(DAMAGE_LABEL_FONT_LOAD_QUERY);
}

function installFont(options: FloatingLabelRuntimeOptions, state: FloatingLabelRuntimeState): void {
  const { scene, pool } = options;
  const previousKey = pool.fontKey;
  const nextKey = toDamageLabelFontKey(state.rasterScale, state.generation);
  installDamageLabelFont(scene, nextKey, state.rasterScale);
  pool.rasterScale = state.rasterScale;
  if (pool.labels.length === 0) {
    fillFloatingLabelPool(scene, pool, nextKey);
  } else {
    setFloatingLabelFont(pool, nextKey);
  }
  if (previousKey !== null && previousKey !== nextKey) {
    removeDamageLabelFont(scene, previousKey);
  }
}

export function registerFloatingLabels(options: FloatingLabelRuntimeOptions): () => void {
  const { scene } = options;
  const state: FloatingLabelRuntimeState = {
    rasterScale: readSceneLabelRasterScale(scene),
    generation: 0,
  };
  let isActive = true;
  installFont(options, state);

  const onResize = () => {
    const nextScale = readSceneLabelRasterScale(scene);
    if (nextScale === state.rasterScale) {
      return;
    }
    state.rasterScale = nextScale;
    installFont(options, state);
    options.onRasterScaleChanged(nextScale);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);

  // The first atlas may have been drawn in a fallback face; redraw it once
  // the web font is in.
  const fontReady = options.whenFontReady ? options.whenFontReady() : defaultWhenFontReady();
  fontReady?.then(
    () => {
      if (!isActive) {
        return;
      }
      state.generation += 1;
      installFont(options, state);
    },
    () => undefined,
  );

  return () => {
    isActive = false;
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    // The atlas lives in the game-wide texture manager; a restarted scene builds its own.
    if (options.pool.fontKey !== null) {
      removeDamageLabelFont(scene, options.pool.fontKey);
    }
  };
}
