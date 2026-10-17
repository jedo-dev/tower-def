import Phaser from 'phaser';
import {
  CREEP_ADORNMENT_TEXTURE_HEIGHT_PX,
  CREEP_ADORNMENT_TEXTURE_KEYS,
  CREEP_ADORNMENT_TEXTURE_WIDTH_PX,
  CREEP_BAR_TEXTURE_SIZE_PX,
  CREEP_RING_TEXTURE_LINE_WIDTH_PX,
} from '../../scenes/creepReadability.constants';

type CanvasPainter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/** A soft black ellipse: opaque core fading to nothing at the rim. */
function paintShadow(context: CanvasRenderingContext2D, width: number, height: number): void {
  const radius = width / 2;
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(1, height / width);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** A thin white ellipse outline, tinted per sender race. */
function paintRing(context: CanvasRenderingContext2D, width: number, height: number): void {
  const inset = CREEP_RING_TEXTURE_LINE_WIDTH_PX / 2 + 1;
  context.strokeStyle = '#ffffff';
  context.lineWidth = CREEP_RING_TEXTURE_LINE_WIDTH_PX;
  context.beginPath();
  context.ellipse(width / 2, height / 2, width / 2 - inset, height / 2 - inset, 0, 0, Math.PI * 2);
  context.stroke();
}

/** Plain white, stretched and tinted into the health bar and its backing. */
function paintSolid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
}

function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: CanvasPainter,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    return;
  }
  paint(texture.getContext(), width, height);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * Idempotent: the creep adornment textures are drawn once per texture manager
 * and shared by every creep, so adornments batch with the sprites.
 */
export function ensureCreepAdornmentTextures(scene: Phaser.Scene): void {
  createCanvasTexture(
    scene,
    CREEP_ADORNMENT_TEXTURE_KEYS.SHADOW,
    CREEP_ADORNMENT_TEXTURE_WIDTH_PX,
    CREEP_ADORNMENT_TEXTURE_HEIGHT_PX,
    paintShadow,
  );
  createCanvasTexture(
    scene,
    CREEP_ADORNMENT_TEXTURE_KEYS.RING,
    CREEP_ADORNMENT_TEXTURE_WIDTH_PX,
    CREEP_ADORNMENT_TEXTURE_HEIGHT_PX,
    paintRing,
  );
  createCanvasTexture(
    scene,
    CREEP_ADORNMENT_TEXTURE_KEYS.BAR,
    CREEP_BAR_TEXTURE_SIZE_PX,
    CREEP_BAR_TEXTURE_SIZE_PX,
    paintSolid,
  );
}
