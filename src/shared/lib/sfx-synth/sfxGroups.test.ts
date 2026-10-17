import { describe, expect, it } from 'vitest';
import {
  SFX_GROUP_BUDGET_BYTES,
  SFX_TOTAL_BUDGET_BYTES,
  findSfxBudgetViolations,
  getSfxGroupOfFile,
  parseSfxGroupArgument,
  selectStaleSfxFiles,
} from './sfxGroups';

const KILOBYTE = 1024;

const FILES = [
  'ui/ui_click.wav',
  'combat/default/creep_spawn.wav',
  'combat/effects/chill.wav',
  'combat/orc/impact.wav',
  'combat/orc/creeps/orc_grunt_hit.wav',
  'combat/orc/creeps/orc_old_unit_hit.wav',
  'combat/human/creeps/human_old_unit_hit.wav',
  'combat/old_core_clip.wav',
  'ambient/loop.wav',
];

describe('getSfxGroupOfFile', () => {
  it('puts race clips under combat/<race>/ into the race group', () => {
    expect(getSfxGroupOfFile('combat/orc/impact.wav')).toBe('orc');
    expect(getSfxGroupOfFile('combat/elf/towers/elf_x_attack.wav')).toBe('elf');
    expect(getSfxGroupOfFile('combat\\undead\\impact.wav')).toBe('undead');
  });

  it('puts every other generated clip into the core and authored ones nowhere', () => {
    expect(getSfxGroupOfFile('ui/ui_click.wav')).toBe('core');
    expect(getSfxGroupOfFile('combat/default/attack.wav')).toBe('core');
    expect(getSfxGroupOfFile('ambient/ambient_map_01.ogg')).toBeUndefined();
  });
});

describe('selectStaleSfxFiles', () => {
  const expected = new Set([
    'ui/ui_click.wav',
    'combat/default/creep_spawn.wav',
    'combat/effects/chill.wav',
    'combat/orc/impact.wav',
    'combat/orc/creeps/orc_grunt_hit.wav',
  ]);

  it('removes every orphan of every group on a full run, never authored files', () => {
    expect(selectStaleSfxFiles(FILES, expected, undefined)).toEqual([
      'combat/orc/creeps/orc_old_unit_hit.wav',
      'combat/human/creeps/human_old_unit_hit.wav',
      'combat/old_core_clip.wav',
    ]);
  });

  it('leaves the files of other groups alone on a filtered run', () => {
    expect(selectStaleSfxFiles(FILES, new Set(), 'orc')).toEqual([
      'combat/orc/impact.wav',
      'combat/orc/creeps/orc_grunt_hit.wav',
      'combat/orc/creeps/orc_old_unit_hit.wav',
    ]);
    expect(selectStaleSfxFiles(FILES, expected, 'human')).toEqual([
      'combat/human/creeps/human_old_unit_hit.wav',
    ]);
    expect(selectStaleSfxFiles(FILES, expected, 'core')).toEqual(['combat/old_core_clip.wav']);
  });
});

describe('parseSfxGroupArgument', () => {
  it('reads the group after --race, or none without the flag', () => {
    expect(parseSfxGroupArgument(['--race', 'orc'])).toBe('orc');
    expect(parseSfxGroupArgument(['--race', 'core'])).toBe('core');
    expect(parseSfxGroupArgument([])).toBeUndefined();
  });

  it('fails on an unknown or missing group', () => {
    expect(() => parseSfxGroupArgument(['--race', 'goblin'])).toThrow(
      '--race expects one of core, undead, orc, human, elf; got goblin',
    );
    expect(() => parseSfxGroupArgument(['--race'])).toThrow('got nothing');
  });
});

describe('sfx budgets', () => {
  it('give the core 800 KB, each race 900 KB, and the total their sum', () => {
    expect(SFX_GROUP_BUDGET_BYTES).toEqual({
      core: 800 * KILOBYTE,
      undead: 900 * KILOBYTE,
      orc: 900 * KILOBYTE,
      human: 900 * KILOBYTE,
      elf: 900 * KILOBYTE,
    });
    expect(SFX_TOTAL_BUDGET_BYTES).toBe(4400 * KILOBYTE);
  });

  it('report each group over its own budget, measured or not', () => {
    expect(findSfxBudgetViolations({ orc: 100, elf: 901 * KILOBYTE })).toEqual([
      { group: 'elf', bytes: 901 * KILOBYTE, budgetBytes: 900 * KILOBYTE },
    ]);
    expect(findSfxBudgetViolations({ core: 800 * KILOBYTE })).toEqual([]);
  });
});
