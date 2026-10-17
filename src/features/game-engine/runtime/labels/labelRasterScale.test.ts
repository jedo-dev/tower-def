import { describe, expect, it } from 'vitest';
import {
  LABEL_RASTER_OVERSAMPLE,
  LABEL_RASTER_SCALE_STEP,
} from '../../scenes/floatingLabel.constants';
import { cssHexColorToTint, formatDamageLabel } from './labelFormatting';
import { resolveLabelRasterScale } from './labelRasterScale';

describe('resolveLabelRasterScale', () => {
  it.each([1, 2, 2.5])('is the pixel ratio %s times the oversample', (pixelRatio) => {
    expect(resolveLabelRasterScale(pixelRatio)).toBeCloseTo(pixelRatio * LABEL_RASTER_OVERSAMPLE);
  });

  it('snaps up to the scale step, so DPR wobble keeps one atlas', () => {
    const scale = resolveLabelRasterScale(1.33);
    expect(scale / LABEL_RASTER_SCALE_STEP).toBe(Math.round(scale / LABEL_RASTER_SCALE_STEP));
    expect(scale).toBeGreaterThanOrEqual(1.33 * LABEL_RASTER_OVERSAMPLE);
    expect(resolveLabelRasterScale(1.331)).toBe(scale);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('treats ratio %s as 1', (pixelRatio) => {
    expect(resolveLabelRasterScale(pixelRatio)).toBe(resolveLabelRasterScale(1));
  });
});

describe('label formatting', () => {
  it('returns the same string instance for a repeated damage value', () => {
    const first = formatDamageLabel(135, 2048);
    expect(first).toBe('135');
    expect(formatDamageLabel(135, 2048)).toBe(first);
  });

  it('formats values outside the cache directly', () => {
    expect(formatDamageLabel(5000, 2048)).toBe('5000');
    expect(formatDamageLabel(2.5, 2048)).toBe('2.5');
  });

  it('turns a css hex colour into a tint', () => {
    expect(cssHexColorToTint('#ffe9a8')).toBe(0xffe9a8);
    expect(cssHexColorToTint('#9de8a4')).toBe(0x9de8a4);
    expect(cssHexColorToTint('not a colour')).toBe(0xffffff);
  });
});
