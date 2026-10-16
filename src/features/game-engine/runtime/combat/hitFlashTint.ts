/**
 * Allocation-free hit flash tint.
 *
 * Reproduces, bit for bit, what Phaser 4 returns for
 * `GetColor(ColorWithColor(ValueToColor(from), ValueToColor(to), steps, step))`
 * without creating `Color` objects every frame (see
 * `phaser/src/display/color/Interpolate.js`, `GetColor.js`, `math/Linear.js`):
 *
 * - `RGBWithRGB` computes `t = step / steps` and each channel as
 *   `Linear(from, to, t) = (to - from) * t + from`, a float that is NOT rounded.
 * - `GetColor` packs with `red << 16 | green << 8 | blue`; the bitwise
 *   operators apply ToInt32 to every channel, which truncates the fraction.
 *
 * Channels are therefore truncated (floored, as they are never negative),
 * not rounded. Keep this order of operations: the float expression must match
 * Phaser's exactly for the truncation to land on the same integer.
 */

/** Resolution of the flash ramp, matching Phaser's default `length` of 100. */
export const HIT_FLASH_INTERPOLATION_STEPS = 100;

const CHANNEL_MASK = 0xff;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

function interpolateChannel(from: number, to: number, t: number): number {
  return Math.trunc((to - from) * t + from);
}

/** Interpolates two `0xRRGGBB` colors at `step / steps`, exactly as Phaser does. */
export function interpolateTint(
  fromColor: number,
  toColor: number,
  steps: number,
  step: number,
): number {
  const t = step / steps;
  const red = interpolateChannel(
    (fromColor >> RED_SHIFT) & CHANNEL_MASK,
    (toColor >> RED_SHIFT) & CHANNEL_MASK,
    t,
  );
  const green = interpolateChannel(
    (fromColor >> GREEN_SHIFT) & CHANNEL_MASK,
    (toColor >> GREEN_SHIFT) & CHANNEL_MASK,
    t,
  );
  const blue = interpolateChannel(fromColor & CHANNEL_MASK, toColor & CHANNEL_MASK, t);
  return (red << RED_SHIFT) | (green << GREEN_SHIFT) | blue;
}

/**
 * The tint a creep shows while its hit flash fades: `remainingMs / durationMs`
 * of the way from its resting tint to the flash color, quantised to
 * {@link HIT_FLASH_INTERPOLATION_STEPS} steps.
 */
export function resolveHitFlashTint(
  restingTint: number,
  flashColor: number,
  remainingMs: number,
  durationMs: number,
): number {
  const step = Math.round((remainingMs / durationMs) * HIT_FLASH_INTERPOLATION_STEPS);
  return interpolateTint(restingTint, flashColor, HIT_FLASH_INTERPOLATION_STEPS, step);
}
