import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOWER_SHEET_FRAME_LAYOUTS, TOWER_SPRITE_ASSETS, TOWER_SPRITE_KEYS } from './sprites';
import { TOWER_SHEET_METRICS } from './towerSheetMetrics.generated';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SCAN_SCRIPT = join(ROOT, 'tools', 'scan-tower-sheet-metrics.py');
const REGENERATE_HINT = 'run `python tools/scan-tower-sheet-metrics.py` and commit the result';
const SHEET_SLOTS = 15;

function sheetSha256(spriteKey: keyof typeof TOWER_SPRITE_ASSETS): string {
  const bytes = readFileSync(join(ROOT, 'public', TOWER_SPRITE_ASSETS[spriteKey]));
  return createHash('sha256').update(bytes).digest('hex');
}

/** Python with Pillow, when this machine has it; CI without it relies on the hashes. */
function findPillowPython(): string | null {
  for (const command of ['python', 'python3']) {
    const probe = spawnSync(command, ['-P', '-E', '-c', 'import PIL'], { encoding: 'utf8' });
    if (probe.status === 0) {
      return command;
    }
  }
  return null;
}

const pillowPython = findPillowPython();

describe('generated tower sheet metrics', () => {
  it('cover exactly the registered tower sheets', () => {
    expect(Object.keys(TOWER_SHEET_METRICS).sort()).toEqual(
      [...Object.values(TOWER_SPRITE_KEYS)].sort(),
    );
  });

  it('were scanned from the sheets as they are now', () => {
    const stale = Object.values(TOWER_SPRITE_KEYS).filter(
      (spriteKey) => TOWER_SHEET_METRICS[spriteKey].sheetSha256 !== sheetSha256(spriteKey),
    );

    expect(stale, REGENERATE_HINT).toEqual([]);
  });

  it('hold one in-frame box per slot and a structure in every idle frame', () => {
    for (const spriteKey of Object.values(TOWER_SPRITE_KEYS)) {
      const { frameBoxes } = TOWER_SHEET_METRICS[spriteKey];
      expect(frameBoxes).toHaveLength(SHEET_SLOTS);
      for (const box of frameBoxes) {
        if (box === null) continue;
        expect(box[0] + box[2]).toBeLessThanOrEqual(60);
        expect(box[1] + box[3]).toBeLessThanOrEqual(60);
      }
      const idle = TOWER_SHEET_FRAME_LAYOUTS[spriteKey]?.idle ?? [3, 4];
      expect(idle.every((frame) => frameBoxes[frame] !== null)).toBe(true);
    }
  });

  it.skipIf(pillowPython === null)('match a fresh scan byte for byte (deterministic)', () => {
    const result = spawnSync(pillowPython ?? 'python', ['-P', '-E', SCAN_SCRIPT, '--check'], {
      encoding: 'utf8',
    });

    expect(result.status, `${result.stderr}${result.stdout}\n${REGENERATE_HINT}`).toBe(0);
  });
});
