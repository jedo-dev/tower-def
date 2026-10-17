import {
  CREEP_WHOLE_SCALE_TOLERANCE,
  PIXEL_ART_MAX_FRAME_SIZE_PX,
} from '../../scenes/creepReadability.constants';

/** Texture sampling a sprite sheet should use; see `creepReadability.constants`. */
export type SpriteSheetFilter = 'nearest' | 'linear';

/** Small frames are pixel art; anything larger is painted art. */
export function isPixelArtFrame(frameSizePx: number): boolean {
  return frameSizePx > 0 && frameSizePx <= PIXEL_ART_MAX_FRAME_SIZE_PX;
}

export function resolveSpriteSheetFilter(frameSizePx: number): SpriteSheetFilter {
  return isPixelArtFrame(frameSizePx) ? 'nearest' : 'linear';
}

/**
 * Display size (square, world px) for a creep that wants `targetPx`, never
 * above `maxPx`. Pixel-art frames snap to a whole multiple of the frame when
 * one is close enough, else to half-frame steps, so every source pixel covers
 * the same (or a 1:2 alternating) number of world pixels. Painted frames keep
 * the capped target as is.
 */
export function pickCreepDisplaySizePx(
  targetPx: number,
  frameSizePx: number,
  maxPx: number,
): number {
  const cappedTargetPx = Math.min(targetPx, maxPx);
  if (!isPixelArtFrame(frameSizePx)) {
    return cappedTargetPx;
  }

  const wholeSizePx = Math.max(1, Math.round(cappedTargetPx / frameSizePx)) * frameSizePx;
  const wholeErrorPx = Math.abs(wholeSizePx - cappedTargetPx);
  if (wholeSizePx <= maxPx && wholeErrorPx <= cappedTargetPx * CREEP_WHOLE_SCALE_TOLERANCE) {
    return wholeSizePx;
  }

  const halfFramePx = frameSizePx / 2;
  const maxHalfSteps = Math.max(1, Math.floor(maxPx / halfFramePx));
  const halfSteps = Math.min(maxHalfSteps, Math.max(1, Math.round(cappedTargetPx / halfFramePx)));
  return halfSteps * halfFramePx;
}
