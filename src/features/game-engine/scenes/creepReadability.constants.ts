/**
 * Creep readability on small screens (tower-def-3br): how creep sprite sheets
 * are filtered and scaled.
 *
 * Filtering rule: a sheet whose frames are at most `PIXEL_ART_MAX_FRAME_SIZE_PX`
 * is pixel art and samples NEAREST, so its pixels stay hard-edged. Larger
 * frames are painted art (the 60px tower sheets) and sample LINEAR, so they
 * downscale smoothly instead of shimmering. Terrain keeps its own LINEAR filter.
 */
export const PIXEL_ART_MAX_FRAME_SIZE_PX = 32;

/**
 * Scaling rule for pixel-art creeps: the display size snaps to a whole
 * multiple of the frame when that lands within this share of the wanted size
 * (and under the cap); otherwise it snaps to half-frame steps, where every
 * source pixel is drawn one or two pixels wide. Painted frames are not snapped.
 */
export const CREEP_WHOLE_SCALE_TOLERANCE = 0.2;

/**
 * Ground shadow, sender ring and health bar drawn with every creep. Sizes and
 * offsets are shares of the creep's display size, so they follow the sprite
 * scale; offsets are from the sprite centre (origin 0.5), positive is down.
 */
export const CREEP_SHADOW_RENDER_DEPTH = 43;
export const CREEP_SENDER_RING_RENDER_DEPTH = 44;
/** Just under the status pips, which sit above the bar. */
export const CREEP_HEALTH_BAR_RENDER_DEPTH = 74;

export const CREEP_SHADOW_ALPHA = 0.55;
export const CREEP_SHADOW_WIDTH_SHARE = 0.62;
export const CREEP_SHADOW_HEIGHT_SHARE = 0.26;
/** The feet of the 32px art sit about this far below the frame centre. */
export const CREEP_SHADOW_OFFSET_Y_SHARE = 0.36;

/** A flier's shadow is smaller, fainter and falls further below and aside. */
export const CREEP_FLIER_SHADOW_ALPHA = 0.32;
export const CREEP_FLIER_SHADOW_WIDTH_SHARE = 0.42;
export const CREEP_FLIER_SHADOW_HEIGHT_SHARE = 0.18;
export const CREEP_FLIER_SHADOW_OFFSET_X_SHARE = 0.08;
export const CREEP_FLIER_SHADOW_OFFSET_Y_SHARE = 0.62;

/** The ring lies on the ground around the shadow. */
export const CREEP_SENDER_RING_ALPHA = 0.95;
export const CREEP_SENDER_RING_WIDTH_SHARE = 0.8;
export const CREEP_SENDER_RING_HEIGHT_SHARE = 0.34;

export const CREEP_HEALTH_BAR_WIDTH_SHARE = 0.62;
export const CREEP_HEALTH_BAR_HEIGHT_PX = 3;
/** The bar sits inside the art's empty top margin, under the status pips. */
export const CREEP_HEALTH_BAR_TOP_INSET_PX = 2;
export const CREEP_HEALTH_BAR_BACK_ALPHA = 0.72;
export const CREEP_HEALTH_BAR_BACK_TINT = 0x000000;
/** At or below this share of health the ramp has reached the warning colour. */
export const CREEP_HEALTH_BAR_WARNING_RATIO = 0.5;

/** Shared, generated once per scene; LINEAR so they scale softly. */
export const CREEP_ADORNMENT_TEXTURE_KEYS = {
  SHADOW: 'creep.adornment.shadow',
  RING: 'creep.adornment.ring',
  BAR: 'creep.adornment.bar',
} as const;
export const CREEP_ADORNMENT_TEXTURE_WIDTH_PX = 64;
export const CREEP_ADORNMENT_TEXTURE_HEIGHT_PX = 32;
export const CREEP_RING_TEXTURE_LINE_WIDTH_PX = 4;
export const CREEP_BAR_TEXTURE_SIZE_PX = 4;
