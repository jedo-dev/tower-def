import { describe, expect, it } from 'vitest';
import globalCss from './global.css?raw';

/** Hex custom properties declared on :root, by name. */
function readHexTokens(source: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of source.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    tokens.set(match[1], match[2]);
  }
  return tokens;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((offset) =>
    channelToLinear(Number.parseInt(hex.slice(offset, offset + 2), 16)),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const WCAG_AA_NORMAL_TEXT = 4.5;
const tokens = readHexTokens(globalCss);

function token(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`missing hex token ${name}`);
  }
  return value;
}

describe('theme contrast (WCAG AA)', () => {
  it('keeps the action label readable on every primary and confirm gradient stop', () => {
    const label = token('--color-action-label');
    for (const stop of [
      '--color-action-primary-top',
      '--color-action-primary',
      '--color-action-primary-bottom',
      '--color-action-confirm-top',
      '--color-action-confirm',
      '--color-action-confirm-bottom',
    ]) {
      expect(contrastRatio(label, token(stop)), stop).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });

  it('keeps every faction accent readable on the app surfaces', () => {
    for (const faction of ['undead', 'orc', 'human', 'elf']) {
      const accent = token(`--color-faction-${faction}`);
      for (const surface of ['--color-surface-app', '--color-surface-canvas']) {
        expect(
          contrastRatio(accent, token(surface)),
          `${faction} on ${surface}`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      }
    }
  });

  it('keeps bestiary codex text and faction accents readable on every codex surface', () => {
    const surfaces = [
      '--color-codex-bg',
      '--color-codex-panel',
      '--color-codex-panel-raised',
      '--color-codex-panel-sunken',
      '--color-codex-bar',
    ];
    const texts = [
      '--color-codex-text',
      '--color-codex-text-muted',
      '--color-codex-text-dim',
      '--color-codex-lore',
      '--color-codex-good',
      '--color-codex-bad',
      '--color-accent-gold',
      ...['undead', 'orc', 'human', 'elf'].map((faction) => `--color-faction-${faction}`),
    ];
    for (const text of texts) {
      for (const surface of surfaces) {
        expect(
          contrastRatio(token(text), token(surface)),
          `${text} on ${surface}`,
        ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      }
    }
  });

  it('keeps the gold ink readable on both stops of the codex gold gradient', () => {
    for (const stop of ['--color-gold-light', '--color-accent-gold-deep']) {
      expect(
        contrastRatio(token('--color-accent-gold-ink'), token(stop)),
        stop,
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });

  it('gives each faction its own accent', () => {
    const accents = ['undead', 'orc', 'human', 'elf'].map((faction) =>
      token(`--color-faction-${faction}`),
    );
    expect(new Set(accents).size).toBe(accents.length);
  });
});
