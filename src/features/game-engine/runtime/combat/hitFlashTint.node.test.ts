import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CREEP_BASE_COLOR,
  CREEP_HIT_FLASH_COLOR,
  CREEP_HIT_FLASH_DURATION_MS,
} from '../../scenes/gameScene.constants';
import {
  HIT_FLASH_INTERPOLATION_STEPS,
  interpolateTint,
  resolveHitFlashTint,
} from './hitFlashTint';

// Phaser's colour helpers are plain CommonJS with no canvas dependency, so the
// real implementations load in node straight from the package sources (the
// package `exports` map hides them from bare subpath imports).
type PhaserRgb = { r: number; g: number; b: number };
type PhaserColorHelpers = {
  ValueToColor: (value: number) => PhaserRgb;
  GetColor: (red: number, green: number, blue: number) => number;
  ColorWithColor: (from: PhaserRgb, to: PhaserRgb, length: number, index: number) => PhaserRgb;
};

function loadPhaserColorHelpers(): PhaserColorHelpers {
  const require = createRequire(import.meta.url);
  const colorDirectory = join(dirname(require.resolve('phaser/package.json')), 'src/display/color');
  const load = (file: string): unknown => require(join(colorDirectory, file));
  const interpolate = load('Interpolate.js') as Pick<PhaserColorHelpers, 'ColorWithColor'>;
  return {
    ValueToColor: load('ValueToColor.js') as PhaserColorHelpers['ValueToColor'],
    GetColor: load('GetColor.js') as PhaserColorHelpers['GetColor'],
    ColorWithColor: interpolate.ColorWithColor,
  };
}

const phaser = loadPhaserColorHelpers();

/** The exact call chain `updateCreepHitFeedback` used before this module. */
function phaserHitFlashTint(
  restingTint: number,
  flashColor: number,
  remainingMs: number,
  durationMs: number,
): number {
  const progress = remainingMs / durationMs;
  const tint = phaser.ColorWithColor(
    phaser.ValueToColor(restingTint),
    phaser.ValueToColor(flashColor),
    HIT_FLASH_INTERPOLATION_STEPS,
    Math.round(progress * HIT_FLASH_INTERPOLATION_STEPS),
  );
  return phaser.GetColor(tint.r, tint.g, tint.b);
}

const FRAME_MS = 1000 / 60;
const FLASH_COLORS = [CREEP_HIT_FLASH_COLOR, 0xff5555, 0x000000];
const RESTING_TINTS = [
  CREEP_BASE_COLOR,
  0x8fce6a,
  0x6ab7ff,
  0x7ddc5a,
  0xc0392b,
  0x000000,
  0x010203,
];
const FLASH_DURATIONS_MS = [CREEP_HIT_FLASH_DURATION_MS, 120, 250];

/** Every `remainingMs` a flash passes through when ticked at 60 fps. */
function flashFramesAt60Fps(durationMs: number): number[] {
  const frames: number[] = [];
  for (let remaining = durationMs - FRAME_MS; remaining > 0; remaining -= FRAME_MS) {
    frames.push(remaining);
  }
  return frames;
}

/** Deterministic 24-bit colours (LCG) to sweep beyond the authored palette. */
function pseudoRandomColors(count: number): number[] {
  const colors: number[] = [];
  let seed = 0x2f6e2b1;
  for (let index = 0; index < count; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    colors.push(seed >>> 8);
  }
  return colors;
}

describe('hit flash tint', () => {
  it('matches Phaser for every 60 fps frame of the flash', () => {
    for (const durationMs of FLASH_DURATIONS_MS) {
      for (const restingTint of RESTING_TINTS) {
        for (const flashColor of FLASH_COLORS) {
          for (const remainingMs of flashFramesAt60Fps(durationMs)) {
            expect(resolveHitFlashTint(restingTint, flashColor, remainingMs, durationMs)).toBe(
              phaserHitFlashTint(restingTint, flashColor, remainingMs, durationMs),
            );
          }
        }
      }
    }
  });

  it('matches Phaser at every ramp step for arbitrary colours', () => {
    const colors = pseudoRandomColors(200);
    for (let pair = 0; pair < colors.length; pair += 2) {
      const from = colors[pair];
      const to = colors[pair + 1];
      for (let step = 0; step <= HIT_FLASH_INTERPOLATION_STEPS; step += 1) {
        const tint = phaser.ColorWithColor(
          phaser.ValueToColor(from),
          phaser.ValueToColor(to),
          HIT_FLASH_INTERPOLATION_STEPS,
          step,
        );
        expect(interpolateTint(from, to, HIT_FLASH_INTERPOLATION_STEPS, step)).toBe(
          phaser.GetColor(tint.r, tint.g, tint.b),
        );
      }
    }
  });

  it('truncates fractional channels the way Phaser does instead of rounding', () => {
    // Halfway from 0x8fce6a to 0xff5555: green 145.5 and blue 95.5 truncate.
    expect(interpolateTint(0x8fce6a, 0xff5555, 100, 50)).toBe(0xc7915f);
    expect(phaserHitFlashTint(0x8fce6a, 0xff5555, 60, 120)).toBe(0xc7915f);
  });

  it('starts on the flash colour and ends on the resting tint', () => {
    expect(resolveHitFlashTint(0x8fce6a, 0xff5555, 120, 120)).toBe(0xff5555);
    expect(resolveHitFlashTint(0x8fce6a, 0xff5555, 0, 120)).toBe(0x8fce6a);
  });
});
