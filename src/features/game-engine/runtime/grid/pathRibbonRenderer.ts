import Phaser from 'phaser';
import type { GridPoint } from '../../../../shared/types/grid';
import {
  buildPathRibbon,
  type PathRibbonGeometryConfig,
  type RibbonSample,
} from './pathRibbonGeometry';

/**
 * Paints the shown creep route as one worn trail: the ribbon from
 * pathRibbonGeometry, filled with the race's seamless path tile, with a soft
 * dark edge. It is baked into one board-sized canvas texture shown by a single
 * world-space Image, so the camera's zoom, pan and pixel ratio apply to it like
 * to any terrain tile, and a frame costs one textured quad.
 *
 * Event-driven: rebuilt only when the shown route (or its race) changes,
 * never per frame.
 */

export type PathRibbonConfig = PathRibbonGeometryConfig & {
  boardWidth: number;
  boardHeight: number;
  renderDepth: number;
  alpha: number;
  tint: number;
  edgeWidth: number;
  edgeAlpha: number;
  edgeColor: string;
  texturePixelsPerWorldUnit: number;
  textureKey: string;
};

export type PathRibbonState = {
  image: Phaser.GameObjects.Image | null;
  texture: Phaser.Textures.CanvasTexture | null;
  /** Route and texture the ribbon shows; a rebuild happens only when it changes. */
  signature: string | null;
  /** Ribbon rebuilds since the scene started (a test seam for the redraw budget). */
  rebuildCount: number;
};

export type PathRibbonRequest = {
  route: readonly GridPoint[];
  /** Texture key of the race's path tile. */
  pathTextureKey: string;
};

export function createPathRibbonState(): PathRibbonState {
  return { image: null, texture: null, signature: null, rebuildCount: 0 };
}

export function toPathRibbonSignature(request: PathRibbonRequest): string {
  let signature = request.pathTextureKey;
  for (const point of request.route) {
    signature += `|${point.x}:${point.y}`;
  }
  return signature;
}

function traceSample(
  context: CanvasRenderingContext2D,
  sample: RibbonSample,
  next: RibbonSample | undefined,
  grow: number,
): void {
  const radius = sample.halfWidth + grow;
  context.beginPath();
  context.arc(sample.x, sample.y, radius, 0, Math.PI * 2);
  context.fill();
  if (!next) {
    return;
  }
  const nextRadius = next.halfWidth + grow;
  context.beginPath();
  context.moveTo(sample.x + sample.normalX * radius, sample.y + sample.normalY * radius);
  context.lineTo(next.x + next.normalX * nextRadius, next.y + next.normalY * nextRadius);
  context.lineTo(next.x - next.normalX * nextRadius, next.y - next.normalY * nextRadius);
  context.lineTo(sample.x - sample.normalX * radius, sample.y - sample.normalY * radius);
  context.closePath();
  context.fill();
}

/**
 * Fills the ribbon as a union of convex pieces (a disc per sample, a quad
 * between samples), each filled on its own so overlaps can never cancel out:
 * round joins and caps fall out of the discs.
 */
function fillRibbon(
  context: CanvasRenderingContext2D,
  samples: readonly RibbonSample[],
  grow: number,
): void {
  for (let index = 0; index < samples.length; index += 1) {
    traceSample(context, samples[index], samples[index + 1], grow);
  }
}

function createPathPattern(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  config: PathRibbonConfig,
): CanvasPattern | null {
  // One cell of the path tile at the baked resolution, so the pattern repeats
  // on the cell grid exactly like the per-cell path tiles did.
  const tileSize = Math.round(config.cellSize * config.texturePixelsPerWorldUnit);
  const tile = document.createElement('canvas');
  tile.width = tileSize;
  tile.height = tileSize;
  const tileContext = tile.getContext('2d');
  if (!tileContext) {
    return null;
  }
  tileContext.imageSmoothingQuality = 'high';
  tileContext.drawImage(source, 0, 0, tileSize, tileSize);
  const pattern = context.createPattern(tile, 'repeat');
  pattern?.setTransform(new DOMMatrix().scale(1 / config.texturePixelsPerWorldUnit));
  return pattern;
}

function resolveSourceImage(scene: Phaser.Scene, key: string): CanvasImageSource | null {
  // No DOM (headless scene tests): nothing to paint, the rebuild still counts.
  if (typeof HTMLImageElement === 'undefined' || !scene.textures.exists(key)) {
    return null;
  }
  const source: unknown = scene.textures.get(key).getSourceImage();
  return source instanceof HTMLImageElement || source instanceof HTMLCanvasElement ? source : null;
}

function paintRibbon(
  context: CanvasRenderingContext2D,
  samples: readonly RibbonSample[],
  pattern: CanvasPattern,
  config: PathRibbonConfig,
): void {
  const { canvas } = context;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (samples.length === 0) {
    return;
  }

  const scale = config.texturePixelsPerWorldUnit;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  // Edge: the grown silhouette, opaque so overlaps stay even, then faded as a
  // whole to the edge alpha.
  context.fillStyle = config.edgeColor;
  fillRibbon(context, samples, config.edgeWidth);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = 'destination-out';
  context.globalAlpha = 1 - config.edgeAlpha;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Trail: the path texture through the ribbon, covering the edge's inside.
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
  context.fillStyle = pattern;
  fillRibbon(context, samples, 0);
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function ensureRibbonImage(
  state: PathRibbonState,
  scene: Phaser.Scene,
  config: PathRibbonConfig,
): Phaser.Textures.CanvasTexture | null {
  if (!state.texture) {
    state.texture = scene.textures.createCanvas(
      config.textureKey,
      Math.round(config.boardWidth * config.texturePixelsPerWorldUnit),
      Math.round(config.boardHeight * config.texturePixelsPerWorldUnit),
    );
    state.texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  if (state.texture && !state.image) {
    const image = scene.add.image(0, 0, config.textureKey);
    image.setOrigin(0, 0);
    image.setDisplaySize(config.boardWidth, config.boardHeight);
    image.setDepth(config.renderDepth);
    image.setAlpha(config.alpha);
    image.setTint(config.tint);
    state.image = image;
  }
  return state.texture;
}

/**
 * Shows `request.route` as the trail. Returns whether it rebuilt: an
 * unchanged route (same cells, same race) is a no-op.
 */
export function syncPathRibbon(
  state: PathRibbonState,
  scene: Phaser.Scene,
  request: PathRibbonRequest,
  config: PathRibbonConfig,
): boolean {
  const signature = toPathRibbonSignature(request);
  if (signature === state.signature) {
    return false;
  }
  state.signature = signature;
  state.rebuildCount += 1;

  const source = resolveSourceImage(scene, request.pathTextureKey);
  const texture = source ? ensureRibbonImage(state, scene, config) : null;
  if (!source || !texture) {
    state.image?.setVisible(false);
    return true;
  }

  const context = texture.getContext();
  const pattern = createPathPattern(context, source, config);
  if (!pattern) {
    state.image?.setVisible(false);
    return true;
  }
  paintRibbon(context, buildPathRibbon(request.route, config), pattern, config);
  texture.refresh();
  state.image?.setVisible(request.route.length > 0);
  return true;
}

export function destroyPathRibbon(state: PathRibbonState): void {
  state.image?.destroy();
  state.image = null;
  // Frees the key too, so the next scene run creates its canvas afresh.
  state.texture?.destroy();
  state.texture = null;
  state.signature = null;
}
