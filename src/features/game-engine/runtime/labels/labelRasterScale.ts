import {
  LABEL_RASTER_OVERSAMPLE,
  LABEL_RASTER_SCALE_STEP,
} from '../../scenes/floatingLabel.constants';

/**
 * Raster pixels per world pixel for in-world labels at a canvas pixel ratio:
 * the ratio times the oversample, snapped up to `LABEL_RASTER_SCALE_STEP`.
 * A ratio that is not a finite positive number renders as ratio 1.
 */
export function resolveLabelRasterScale(pixelRatio: number): number {
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const raw = safeRatio * LABEL_RASTER_OVERSAMPLE;
  return Math.ceil(raw / LABEL_RASTER_SCALE_STEP - 1e-9) * LABEL_RASTER_SCALE_STEP;
}
