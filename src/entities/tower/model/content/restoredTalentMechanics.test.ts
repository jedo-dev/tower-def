import { describe, expect, it } from 'vitest';
import { buildableTowers } from '../config/buildableTowers';
import type { TowerLevelStats } from '../upgradeConfig';

// The branches tower-def-bge.9 swapped back from their tower-def-bge.3
// substitutions to the docs/11 mechanics (docs/07 "Tower talents authoring").

function grades(branchId: string): readonly TowerLevelStats[] {
  const branch = buildableTowers
    .flatMap((tower) => tower.talentBranches)
    .find((candidate) => candidate.id === branchId);
  expect(branch, branchId).toBeDefined();
  return branch?.grades.map((grade) => grade.stats) ?? [];
}

describe('restored talent mechanics (tower-def-bge.9)', () => {
  it('ground zones: Plague Cloud, Spores and Quagmire leave zones on every grade', () => {
    for (const branchId of [
      'undead_plague_tower_cloud',
      'elf_wisp_bloom_spores',
      'orc_tar_pit_quagmire',
    ]) {
      for (const stats of grades(branchId)) {
        expect(stats.abilities?.groundZone, branchId).toBeDefined();
        expect(stats.abilities?.extraTargets, branchId).toBeUndefined();
      }
    }
    expect(grades('orc_tar_pit_quagmire').map((s) => s.abilities?.groundZone?.radiusCells)).toEqual(
      [1.5, 2, 2.5, 3],
    );
  });

  it('cone: Wyrm Breath opens 30-60 degrees instead of piercing a line', () => {
    const breath = grades('undead_frost_wyrm_nest_breath');
    expect(breath.map((stats) => stats.abilities?.coneDegrees)).toEqual([30, 40, 50, 60]);
    expect(breath.every((stats) => stats.abilities?.pierceLine === undefined)).toBe(true);
  });

  it('grounding: Permafrost freezes and Wild Growth pulls fliers down at grade 7', () => {
    const permafrost = grades('undead_frost_wyrm_nest_permafrost')[3];
    expect(permafrost.onHitEffects?.[0].groundsFliersMs).toBe(1400);
    expect(permafrost.abilities?.airDamageMultiplier).toBeUndefined();
    expect(grades('elf_wisp_bloom_growth')[3].abilities?.groundsFliersMs).toBe(1000);
  });

  it('knockback replaces the stuns of Mortar grade 7 and Grapeshot grades 6-7', () => {
    expect(grades('orc_burning_pit_mortar')[3].abilities?.knockbackCells).toBe(1);
    const grapeshot = grades('human_cannon_bastion_grapeshot');
    expect(grapeshot.map((stats) => stats.abilities?.knockbackCells)).toEqual([
      undefined,
      undefined,
      0.5,
      1,
    ]);
    expect(grapeshot.every((stats) => stats.onHitEffects === undefined)).toBe(true);
  });

  it('corpse explosions: Corpse Blast explodes 20-50% of max health, chaining at 6-7', () => {
    const corpse = grades('undead_plague_tower_corpse');
    expect(corpse.map((stats) => stats.abilities?.corpseExplosionShare)).toEqual([
      0.2, 0.3, 0.4, 0.5,
    ]);
    expect(corpse.map((stats) => stats.abilities?.corpseExplosionChainLimit)).toEqual([
      undefined,
      undefined,
      3,
      20,
    ]);
  });

  it('per-grade scope: Mortar and Wild Growth reach fliers from grade 4', () => {
    for (const branchId of ['orc_burning_pit_mortar', 'elf_wisp_bloom_growth']) {
      expect(grades(branchId).map((stats) => stats.allowedTargets)).toEqual([
        'both',
        'both',
        'both',
        'both',
      ]);
    }
  });
});
