import Phaser from 'phaser';
import {
  DAMAGE_LABEL_ATLAS_MAX_WIDTH_PX,
  DAMAGE_LABEL_BASE_FONT_SIZE_PX,
  DAMAGE_LABEL_FONT_FAMILY,
  DAMAGE_LABEL_FONT_KEY_PREFIX,
  DAMAGE_LABEL_GLYPHS,
  DAMAGE_LABEL_STROKE_COLOR,
  DAMAGE_LABEL_STROKE_WIDTH_PX,
} from '../../scenes/floatingLabel.constants';
import {
  createBitmapFontData,
  layoutGlyphAtlas,
  type GlyphAtlasLayout,
} from './damageLabelFontLayout';

/**
 * The damage label bitmap font: glyphs drawn white with a dark outline onto
 * one canvas texture at a raster scale, registered in the bitmap font cache.
 * Built once per raster scale (and once more when the web font finishes
 * loading); every damage number then only moves quads over this one atlas.
 */

export function toDamageLabelFontKey(rasterScale: number, generation: number): string {
  return `${DAMAGE_LABEL_FONT_KEY_PREFIX}@${rasterScale}#${generation}`;
}

function toCanvasFont(fontSize: number): string {
  return `${fontSize}px ${DAMAGE_LABEL_FONT_FAMILY}`;
}

function paintGlyphs(
  context: CanvasRenderingContext2D,
  layout: GlyphAtlasLayout,
  strokeWidth: number,
): void {
  context.font = toCanvasFont(layout.fontSize);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.lineJoin = 'round';
  context.lineWidth = strokeWidth;
  context.strokeStyle = DAMAGE_LABEL_STROKE_COLOR;
  context.fillStyle = '#ffffff';
  for (const cell of layout.cells) {
    const y = cell.y + layout.padding + layout.lineHeight / 2;
    context.strokeText(cell.glyph, cell.drawX, y);
    context.fillText(cell.glyph, cell.drawX, y);
  }
}

/**
 * Draws and registers the font under `fontKey`. Returns false when the
 * texture manager gave no canvas (the key is taken, or a headless test scene).
 */
export function installDamageLabelFont(
  scene: Phaser.Scene,
  fontKey: string,
  rasterScale: number,
): boolean {
  if (scene.cache.bitmapFont.exists(fontKey)) {
    return true;
  }
  const texture = scene.textures.createCanvas(fontKey, 1, 1);
  if (!texture) {
    return false;
  }

  const fontSize = Math.round(DAMAGE_LABEL_BASE_FONT_SIZE_PX * rasterScale);
  const strokeWidth = DAMAGE_LABEL_STROKE_WIDTH_PX * rasterScale;
  const measureContext = texture.getContext();
  measureContext.font = toCanvasFont(fontSize);
  const layout = layoutGlyphAtlas({
    glyphs: DAMAGE_LABEL_GLYPHS,
    fontSize,
    strokeWidth,
    maxWidth: DAMAGE_LABEL_ATLAS_MAX_WIDTH_PX,
    measure: (glyph) => ({ advance: measureContext.measureText(glyph).width }),
  });

  // Resizing the canvas resets its context state, so paint sets it again.
  texture.setSize(layout.width, layout.height);
  paintGlyphs(texture.getContext(), layout, strokeWidth);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  scene.cache.bitmapFont.add(fontKey, {
    data: createBitmapFontData(fontKey, layout),
    texture: fontKey,
    frame: null,
  });
  return true;
}

/** Drops a font no label uses any more: its cache entry and its texture. */
export function removeDamageLabelFont(scene: Phaser.Scene, fontKey: string): void {
  scene.cache.bitmapFont.remove(fontKey);
  if (scene.textures.exists(fontKey)) {
    scene.textures.remove(fontKey);
  }
}
