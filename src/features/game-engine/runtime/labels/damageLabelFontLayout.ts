import type Phaser from 'phaser';

/**
 * Pure layout of the damage label atlas: glyph cells packed in rows, and the
 * Phaser bitmap font data describing them. Everything is in raster pixels;
 * the font's `size` is the raster font size, so a BitmapText drawn at a world
 * font size shows each glyph at `worldSize / size` world pixels per texel.
 */

type BitmapFontData = Phaser.Types.GameObjects.BitmapText.BitmapFontData;
/** Phaser's typedef omits `xAdvance`, which its layout code reads. */
type BitmapFontCharacterData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & {
  xAdvance: number;
};

export type GlyphMetrics = {
  /** Pen advance of the glyph as measured by the canvas. */
  advance: number;
};

export type GlyphCell = {
  glyph: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the glyph's own advance box starts inside the cell. */
  drawX: number;
  /** Pen advance to the next glyph, outline included. */
  xAdvance: number;
};

export type GlyphAtlasLayout = {
  width: number;
  height: number;
  /** Raster font size the atlas was drawn at. */
  fontSize: number;
  lineHeight: number;
  /** Space around each glyph's advance box for its outline. */
  padding: number;
  cells: GlyphCell[];
};

export type GlyphAtlasSpec = {
  glyphs: string;
  fontSize: number;
  strokeWidth: number;
  maxWidth: number;
  measure: (glyph: string) => GlyphMetrics;
};

/** Packs one cell per glyph, left to right, wrapping rows at `maxWidth`. */
export function layoutGlyphAtlas(spec: GlyphAtlasSpec): GlyphAtlasLayout {
  const padding = Math.ceil(spec.strokeWidth / 2) + 1;
  const lineHeight = Math.ceil(spec.fontSize * 1.25);
  const cellHeight = lineHeight + padding * 2;
  const cells: GlyphCell[] = [];
  let x = 0;
  let y = 0;
  let width = 1;

  for (const glyph of spec.glyphs) {
    const advance = Math.max(0, spec.measure(glyph).advance);
    const cellWidth = Math.ceil(advance) + padding * 2;
    if (x > 0 && x + cellWidth > spec.maxWidth) {
      x = 0;
      y += cellHeight;
    }
    cells.push({
      glyph,
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      drawX: x + padding,
      xAdvance: Math.ceil(advance + spec.strokeWidth / 2),
    });
    x += cellWidth;
    width = Math.max(width, x);
  }

  return {
    width,
    height: Math.max(1, y + cellHeight),
    fontSize: spec.fontSize,
    lineHeight,
    padding,
    cells,
  };
}

/**
 * Phaser bitmap font data for a laid-out atlas. UVs follow Phaser 4's parsers
 * (v measured from the bottom of the texture).
 */
export function createBitmapFontData(fontKey: string, layout: GlyphAtlasLayout): BitmapFontData {
  const chars: Record<number, BitmapFontCharacterData> = {};

  for (const cell of layout.cells) {
    const character: BitmapFontCharacterData = {
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      centerX: Math.floor(cell.width / 2),
      centerY: Math.floor(cell.height / 2),
      xOffset: -layout.padding,
      yOffset: -layout.padding,
      xAdvance: cell.xAdvance,
      data: {},
      kerning: {},
      u0: cell.x / layout.width,
      v0: 1 - cell.y / layout.height,
      u1: (cell.x + cell.width) / layout.width,
      v1: 1 - (cell.y + cell.height) / layout.height,
    };
    chars[cell.glyph.charCodeAt(0)] = character;
  }

  return {
    font: fontKey,
    size: layout.fontSize,
    lineHeight: layout.lineHeight,
    retroFont: false,
    chars,
  };
}
