import { describe, expect, it } from 'vitest';
import { FACTION_ACCENT_COLORS, STATUS_COLORS } from '../../shared/constants/theme/gameColors';
import globalCss from './global.css?raw';

function readToken(name: string): number {
  const match = new RegExp(`${name}:\\s*#([0-9a-f]{6})\\s*;`, 'i').exec(globalCss);
  if (!match) {
    throw new Error(`Missing colour token ${name}`);
  }
  return Number.parseInt(match[1], 16);
}

// The Phaser canvas reads colours as numbers; they must stay the CSS tokens.
describe('game colour mirrors', () => {
  it('match the faction accent tokens', () => {
    for (const [faction, color] of Object.entries(FACTION_ACCENT_COLORS)) {
      expect(color, faction).toBe(readToken(`--color-faction-${faction}`));
    }
  });

  it('match the status tokens', () => {
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      expect(color, status).toBe(readToken(`--color-${status}`));
    }
  });
});
