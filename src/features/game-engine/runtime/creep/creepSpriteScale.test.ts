import { describe, expect, it } from 'vitest';
import {
  TOWER_SPRITE_SHEET_FRAME,
  UNIT_SPRITE_SHEET_FRAME,
} from '../../../../shared/constants/sprites';
import {
  isPixelArtFrame,
  pickCreepDisplaySizePx,
  resolveSpriteSheetFilter,
} from './creepSpriteScale';

describe('resolveSpriteSheetFilter', () => {
  it('keeps the 32px creep sheets crisp and the painted tower sheets smooth', () => {
    expect(resolveSpriteSheetFilter(UNIT_SPRITE_SHEET_FRAME.width)).toBe('nearest');
    expect(resolveSpriteSheetFilter(TOWER_SPRITE_SHEET_FRAME.width)).toBe('linear');
  });

  it('treats an empty frame as painted', () => {
    expect(isPixelArtFrame(0)).toBe(false);
  });
});

describe('pickCreepDisplaySizePx', () => {
  it('snaps to a whole multiple of the frame when it is close', () => {
    expect(pickCreepDisplaySizePx(29.8, 32, 48)).toBe(32);
    expect(pickCreepDisplaySizePx(34, 32, 48)).toBe(32);
    expect(pickCreepDisplaySizePx(60, 32, 96)).toBe(64);
  });

  it('falls back to half-frame steps when the whole multiple breaks the cap', () => {
    // Whole 2x would be 64px, over the 48px cap: 1.5x keeps pixels 1:2 crisp.
    expect(pickCreepDisplaySizePx(51.2, 32, 48)).toBe(48);
  });

  it('falls back to half-frame steps when no whole multiple is close', () => {
    expect(pickCreepDisplaySizePx(48, 32, 100)).toBe(48);
    expect(pickCreepDisplaySizePx(16, 32, 100)).toBe(16);
  });

  it('never returns more than the cap or less than half a frame', () => {
    expect(pickCreepDisplaySizePx(500, 32, 48)).toBe(48);
    expect(pickCreepDisplaySizePx(2, 32, 48)).toBe(16);
  });

  it('leaves painted frames at the capped target', () => {
    expect(pickCreepDisplaySizePx(51.2, 60, 48)).toBe(48);
    expect(pickCreepDisplaySizePx(37.5, 60, 48)).toBe(37.5);
  });
});
