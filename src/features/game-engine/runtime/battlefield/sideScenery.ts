import type Phaser from 'phaser';
import {
  TERRAIN_SIDE_SCENERY_ASSETS,
  type SideSceneryEdge,
} from '../../../../shared/constants/terrain';
import type { RaceId } from '../../../../shared/types/content-ids';
import {
  computeLeftSideSceneryPlacement,
  computeRightSideSceneryPlacement,
  type SideSceneryBoardSize,
  type SideSceneryStripPlacement,
  type SideSceneryTextureSize,
} from './sideSceneryLayout';

/**
 * The two painted strips beside the board. Both battlefields share one board
 * world space (the view switch redraws the same tiles for the other field),
 * so one pair serves both: its texture follows the race of the field in view.
 * World-space, non-interactive images: they follow the camera like the grid
 * and never take part in pointer hit-testing.
 */
export type SideSceneryLayer = {
  left: Phaser.GameObjects.Image | null;
  right: Phaser.GameObjects.Image | null;
  /** Race the strips currently show; null until the first sync. */
  raceId: RaceId | null;
};

export type SideScenerySyncOptions = {
  readonly raceId: RaceId;
  readonly board: SideSceneryBoardSize;
  /** Below the ground tiles. */
  readonly depth: number;
};

export function createSideSceneryLayer(): SideSceneryLayer {
  return { left: null, right: null, raceId: null };
}

function createStrip(
  scene: Phaser.Scene,
  textureKey: string,
  depth: number,
): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, textureKey).setDepth(depth);
}

function placeStrip(
  scene: Phaser.Scene,
  strip: Phaser.GameObjects.Image,
  textureKey: string,
  edge: SideSceneryEdge,
  board: SideSceneryBoardSize,
): void {
  strip.setTexture(textureKey);
  const texture: SideSceneryTextureSize = { width: strip.width, height: strip.height };
  const placement: SideSceneryStripPlacement =
    edge === 'left'
      ? computeLeftSideSceneryPlacement(board, texture)
      : computeRightSideSceneryPlacement(board, texture);
  strip.setPosition(placement.x, placement.y);
  strip.setScale(placement.scale);
  // A missing texture would render Phaser's placeholder box: show darkness instead.
  strip.setVisible(scene.textures.exists(textureKey) && placement.scale > 0);
}

/**
 * Creates the strips on first use and swaps their texture when the race in
 * view changes; otherwise does nothing. Called on view and match changes,
 * never per frame.
 */
export function syncSideScenery(
  scene: Phaser.Scene,
  layer: SideSceneryLayer,
  options: SideScenerySyncOptions,
): void {
  const assets = TERRAIN_SIDE_SCENERY_ASSETS[options.raceId];
  const left = layer.left ?? createStrip(scene, assets.left.key, options.depth);
  const right = layer.right ?? createStrip(scene, assets.right.key, options.depth);
  const isNew = layer.left === null || layer.right === null;
  layer.left = left;
  layer.right = right;
  if (!isNew && layer.raceId === options.raceId) {
    return;
  }

  layer.raceId = options.raceId;
  placeStrip(scene, left, assets.left.key, 'left', options.board);
  placeStrip(scene, right, assets.right.key, 'right', options.board);
}

export function destroySideScenery(layer: SideSceneryLayer): void {
  layer.left?.destroy();
  layer.right?.destroy();
  layer.left = null;
  layer.right = null;
  layer.raceId = null;
}
