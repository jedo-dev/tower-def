import type Phaser from 'phaser';
import {
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../../constants/sprites';
import {
  PLACEHOLDER_BORDER_COLOR,
  PLACEHOLDER_BORDER_DASH_PX,
  PLACEHOLDER_BORDER_WIDTH_PX,
  PLACEHOLDER_CORNER_RADIUS_PX,
  PLACEHOLDER_GLYPH,
  PLACEHOLDER_GLYPH_COLOR,
  PLACEHOLDER_PLATE_COLOR,
  PLACEHOLDER_TOWER_FRAME_COUNT,
  PLACEHOLDER_UNIT_FRAME_COUNT,
} from '../../scenes/gameScene.constants';

/**
 * Placeholder art for content that has no sprite yet. It is drawn at scene
 * start instead of shipped as a file, so a new tower or creep is playable the
 * moment it is authored - and unmistakably marked as unfinished.
 */
export const PLACEHOLDER_TEXTURE_KEYS = {
  UNIT: 'placeholder.unit',
  TOWER: 'placeholder.tower',
} as const;

export type PlaceholderTextureKey =
  (typeof PLACEHOLDER_TEXTURE_KEYS)[keyof typeof PLACEHOLDER_TEXTURE_KEYS];

type FrameSpec = {
  key: PlaceholderTextureKey;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
};

const PLACEHOLDER_FRAME_SPECS: readonly FrameSpec[] = [
  {
    key: PLACEHOLDER_TEXTURE_KEYS.UNIT,
    frameWidth: UNIT_SPRITE_SHEET_FRAME.width,
    frameHeight: UNIT_SPRITE_SHEET_FRAME.height,
    frameCount: PLACEHOLDER_UNIT_FRAME_COUNT,
  },
  {
    key: PLACEHOLDER_TEXTURE_KEYS.TOWER,
    frameWidth: TOWER_SPRITE_SHEET_FRAME.width,
    frameHeight: TOWER_SPRITE_SHEET_FRAME.height,
    frameCount: PLACEHOLDER_TOWER_FRAME_COUNT,
  },
];

function drawPlaceholderFrame(
  context: CanvasRenderingContext2D,
  offsetX: number,
  frameWidth: number,
  frameHeight: number,
): void {
  const inset = PLACEHOLDER_BORDER_WIDTH_PX;
  const width = frameWidth - inset * 2;
  const height = frameHeight - inset * 2;

  context.fillStyle = PLACEHOLDER_PLATE_COLOR;
  context.beginPath();
  context.roundRect(offsetX + inset, inset, width, height, PLACEHOLDER_CORNER_RADIUS_PX);
  context.fill();

  context.strokeStyle = PLACEHOLDER_BORDER_COLOR;
  context.lineWidth = PLACEHOLDER_BORDER_WIDTH_PX;
  context.setLineDash([PLACEHOLDER_BORDER_DASH_PX, PLACEHOLDER_BORDER_DASH_PX]);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = PLACEHOLDER_GLYPH_COLOR;
  // The glyph fills most of the frame so it stays readable at creep size on a
  // 360px wide viewport.
  context.font = `bold ${Math.round(frameHeight * 0.72)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(PLACEHOLDER_GLYPH, offsetX + frameWidth / 2, frameHeight / 2 + 1);
}

function createPlaceholderSpriteSheet(scene: Phaser.Scene, spec: FrameSpec): void {
  if (scene.textures.exists(spec.key)) {
    return;
  }

  const texture = scene.textures.createCanvas(
    spec.key,
    spec.frameWidth * spec.frameCount,
    spec.frameHeight,
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();

  for (let frameIndex = 0; frameIndex < spec.frameCount; frameIndex += 1) {
    drawPlaceholderFrame(context, frameIndex * spec.frameWidth, spec.frameWidth, spec.frameHeight);
    // Numbered frames let animation code address the placeholder exactly like a
    // finished sheet, so no caller needs a special case.
    texture.add(
      frameIndex,
      0,
      frameIndex * spec.frameWidth,
      0,
      spec.frameWidth,
      spec.frameHeight,
    );
  }

  texture.refresh();
}

/** Idempotent: the textures are drawn once and reused for the scene lifetime. */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  for (const spec of PLACEHOLDER_FRAME_SPECS) {
    createPlaceholderSpriteSheet(scene, spec);
  }
}

export function getPlaceholderFrameCount(key: PlaceholderTextureKey): number {
  return PLACEHOLDER_FRAME_SPECS.find((spec) => spec.key === key)?.frameCount ?? 0;
}
