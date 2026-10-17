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
