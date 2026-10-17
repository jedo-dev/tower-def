/**
 * In-world labels (tower-def-0zc): damage numbers and creep effect pips.
 *
 * The game config is `pixelArt`, so a texture samples NEAREST and a 1x text
 * texture blown up by the device-pixel-ratio camera reads blocky. Labels are
 * rasterised at `pixelRatio x LABEL_RASTER_OVERSAMPLE` and sample LINEAR.
 * See docs/04-decisions.md, Decision 017.
 */

/**
 * Extra raster scale over the canvas pixel ratio. A world pixel covers about
 * 0.9 CSS px at the board's fit zoom and up to 3x that at the zoom cap; 1.5 is
 * near the geometric middle, so a label is never resampled by much more than
 * 1.7x either way (linear filtering hides that much).
 */
export const LABEL_RASTER_OVERSAMPLE = 1.5;
/** `Phaser.Textures.FilterMode.LINEAR`, kept here so Phaser-free modules can set it. */
export const LABEL_TEXTURE_FILTER_LINEAR = 0;
/** Raster scales snap to this step, so a sub-percent DPR wobble keeps the atlas. */
export const LABEL_RASTER_SCALE_STEP = 0.25;

/**
 * Damage number BitmapTexts pre-created per scene, shared by both fields.
 * At the 420 ms lifetime this covers ~220 hits a second (a busy headless wave
 * measured ~65 live numbers at 120 hits/s); a hit that finds the
 * pool empty shows no number rather than allocating one.
 */
export const DAMAGE_LABEL_POOL_SIZE = 96;
/** Above creeps, their health bars and effect pips. */
export const DAMAGE_LABEL_RENDER_DEPTH = 76;

export const DAMAGE_LABEL_FONT_KEY_PREFIX = 'damage-label-font';
export const DAMAGE_LABEL_FONT_FAMILY = '"Exo 2", "Segoe UI", Tahoma, sans-serif';
/** The font face the atlas waits for before it is rasterised for good. */
export const DAMAGE_LABEL_FONT_LOAD_QUERY = '11px "Exo 2"';
/** World-pixel size the atlas is described at; numbers are drawn at their own size. */
export const DAMAGE_LABEL_BASE_FONT_SIZE_PX = 11;
export const DAMAGE_NUMBER_HIT_FONT_SIZE_PX = 11;
export const DAMAGE_NUMBER_EFFECT_FONT_SIZE_PX = 10;
/** Drawn under each glyph in the atlas; the label tint multiplies it too. */
export const DAMAGE_LABEL_STROKE_COLOR = '#1d2536';
export const DAMAGE_LABEL_STROKE_WIDTH_PX = 2;
/** Damage numbers sit this far above the hit cell centre. */
export const DAMAGE_NUMBER_OFFSET_Y_PX = 10;
/**
 * Glyphs in the atlas: digits and signs for numbers, capitals for short
 * effect labels. A character outside the set is skipped when drawn.
 */
export const DAMAGE_LABEL_GLYPHS = '0123456789+-%×.!?:ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Atlas rows wrap at this width in raster pixels. */
export const DAMAGE_LABEL_ATLAS_MAX_WIDTH_PX = 1024;
/** Damage values below this reuse a cached label string. */
export const DAMAGE_LABEL_STRING_CACHE_SIZE = 2048;
