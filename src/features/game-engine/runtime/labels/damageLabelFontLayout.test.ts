import { describe, expect, it } from 'vitest';
import { createBitmapFontData, layoutGlyphAtlas } from './damageLabelFontLayout';

const SPEC = {
  glyphs: '0123',
  fontSize: 40,
  strokeWidth: 6,
  maxWidth: 100,
  measure: (glyph: string) => ({ advance: glyph === '1' ? 12 : 22 }),
};

describe('damage label atlas layout', () => {
  it('packs one padded cell per glyph and wraps rows at the max width', () => {
    const layout = layoutGlyphAtlas(SPEC);
    const padding = 4; // ceil(6 / 2) + 1

    expect(layout.padding).toBe(padding);
    expect(layout.cells.map((cell) => cell.glyph)).toEqual(['0', '1', '2', '3']);
    expect(layout.cells.map((cell) => cell.width)).toEqual([30, 20, 30, 30]);
    // 30 + 20 + 30 = 80 fits; the fourth cell wraps.
    expect(layout.cells.map((cell) => [cell.x, cell.y])).toEqual([
      [0, 0],
      [30, 0],
      [50, 0],
      [0, layout.cells[0].height],
    ]);
    expect(layout.width).toBe(80);
    expect(layout.height).toBe(layout.cells[0].height * 2);
    expect(layout.cells.every((cell) => cell.x + cell.width <= layout.width)).toBe(true);
  });

  it('describes every glyph to Phaser with UVs inside the texture', () => {
    const layout = layoutGlyphAtlas(SPEC);
    const data = createBitmapFontData('font-key', layout);

    expect(data.font).toBe('font-key');
    expect(data.size).toBe(SPEC.fontSize);
    expect(Object.keys(data.chars).map(Number)).toEqual([48, 49, 50, 51]);
    const one = data.chars['1'.charCodeAt(0)];
    expect(one.x).toBe(30);
    expect(one.u0).toBeCloseTo(30 / 80);
    expect(one.u1).toBeCloseTo(50 / 80);
    expect(one.v0).toBeCloseTo(1);
    expect(one.v1).toBeCloseTo(0.5);
    expect(one.xOffset).toBe(-layout.padding);
    expect((one as typeof one & { xAdvance: number }).xAdvance).toBe(15);
  });
});
