import { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  CREEP_FLIER_SHADOW_ALPHA,
  CREEP_FLIER_SHADOW_HEIGHT_SHARE,
  CREEP_FLIER_SHADOW_OFFSET_X_SHARE,
  CREEP_FLIER_SHADOW_OFFSET_Y_SHARE,
  CREEP_FLIER_SHADOW_WIDTH_SHARE,
  CREEP_SHADOW_ALPHA,
  CREEP_SHADOW_HEIGHT_SHARE,
  CREEP_SHADOW_OFFSET_Y_SHARE,
  CREEP_SHADOW_WIDTH_SHARE,
} from '../../scenes/creepReadability.constants';

/** Where and how large a creep's ground shadow is, relative to the sprite centre. */
export type CreepShadowLayout = {
  widthPx: number;
  heightPx: number;
  offsetXPx: number;
  offsetYPx: number;
  alpha: number;
};

/**
 * Written into `out` so a reused adornment record keeps its layout object. A
 * flier's shadow is smaller and fainter and falls below and aside, so the
 * creature reads as airborne; a ground creep's sits under its feet.
 */
export function writeCreepShadowLayout(
  displaySizePx: number,
  moveType: UnitMoveType,
  out: CreepShadowLayout,
): CreepShadowLayout {
  const isFlier = moveType === UnitMoveType.AIR;
  out.widthPx =
    displaySizePx * (isFlier ? CREEP_FLIER_SHADOW_WIDTH_SHARE : CREEP_SHADOW_WIDTH_SHARE);
  out.heightPx =
    displaySizePx * (isFlier ? CREEP_FLIER_SHADOW_HEIGHT_SHARE : CREEP_SHADOW_HEIGHT_SHARE);
  out.offsetXPx = isFlier ? displaySizePx * CREEP_FLIER_SHADOW_OFFSET_X_SHARE : 0;
  out.offsetYPx =
    displaySizePx * (isFlier ? CREEP_FLIER_SHADOW_OFFSET_Y_SHARE : CREEP_SHADOW_OFFSET_Y_SHARE);
  out.alpha = isFlier ? CREEP_FLIER_SHADOW_ALPHA : CREEP_SHADOW_ALPHA;
  return out;
}

export function createCreepShadowLayout(): CreepShadowLayout {
  return { widthPx: 0, heightPx: 0, offsetXPx: 0, offsetYPx: 0, alpha: 0 };
}
