import { describe, expect, it } from 'vitest';
import {
  buildableTowers,
  resolveBuildableTowerById,
  type BuildableTowerId,
} from '../../../entities/tower';
import {
  TOWER_TALENT_GRADE_LEVELS,
  TowerTalentPricing,
} from '../../../shared/constants/towerTalents';
import { DamageType } from '../../../shared/types/content-ids';
import { describeGradeSpecial, mapTalentBranch } from './towerBranchCards';
import { mapTowerToTowerCard } from './towerCards';

function branchCard(towerId: BuildableTowerId, branchIndex: number) {
  return mapTowerToTowerCard(resolveBuildableTowerById(towerId)).talentBranches[branchIndex];
}

describe('talent branch cards', () => {
  it('gives every shipped tower two branches with four priced grade rows', () => {
    for (const tower of buildableTowers) {
      const card = mapTowerToTowerCard(tower);

      expect(card.talentBranches, tower.id).toHaveLength(2);
      for (const branch of card.talentBranches) {
        expect(branch.description.length, branch.id).toBeGreaterThan(0);
        expect(
          branch.grades.map((grade) => [grade.level, grade.upgradeCost]),
          branch.id,
        ).toEqual(
          TOWER_TALENT_GRADE_LEVELS.map((level) => [level, TowerTalentPricing.GRADE_COSTS[level]]),
        );
        for (const grade of branch.grades) {
          expect(grade.special.length, `${branch.id} grade ${grade.level}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('reads damage, range and reload from the authored grade', () => {
    const tower = resolveBuildableTowerById('undead_bone_archer_tower');
    const [volley] = tower.talentBranches;
    const [gradeFour] = branchCard('undead_bone_archer_tower', 0).grades;

    expect(gradeFour.damage).toBe(String(volley.grades[0].stats.damage));
    expect(gradeFour.range).toBe(String(volley.grades[0].stats.range));
    expect(gradeFour.cooldown).toBe('0.55s');
    expect(gradeFour.special).toBe('+1 target at 33%');
  });

  it('spells out abilities and effects in the special line', () => {
    const volley = branchCard('undead_bone_archer_tower', 0);
    const cursed = branchCard('undead_bone_archer_tower', 1);
    const moonfall = branchCard('elf_moon_archer_tower', 0);

    expect(volley.grades[1].special).toBe('+1 target at 50%');
    expect(cursed.grades[3].special).toBe(
      'armor break -10 magical armor for 4.0s, up to 2 stacks; ' +
        'armor break -5 physical armor for 4.0s, up to 2 stacks',
    );
    expect(moonfall.grades[3].special).toBe('every 3 shots crit x2');
  });

  it('shows a support grade without an attack as dashes and describes its aura', () => {
    const [gradeFour, , , gradeSeven] = branchCard('human_guard_post', 1).grades;

    expect([gradeFour.damage, gradeFour.range, gradeFour.cooldown]).toEqual(['—', '—', '—']);
    expect(gradeSeven.special).toBe(
      'aura 8.5 cells: +34% attack speed, +1.4 range, +4g per kill, +15g income per round, ' +
        '+25% sell refund',
    );
    expect(branchCard('undead_bone_obelisk', 0).grades[1].special).toBe(
      'aura 8 cells: +42% attack speed, +1.8 range, +10% magical damage',
    );
  });

  it('describes a volley, a chain and a percent tower in player terms', () => {
    const harvest = branchCard('undead_bone_obelisk', 1);
    const storm = branchCard('orc_lightning_totem', 0);
    const thornbite = branchCard('elf_thorn_spire', 0);

    expect(harvest.grades[0].damage).toBe('16');
    expect(harvest.grades[0].special).toMatch(/volley at all in range every 1\.5s$/);
    expect(storm.grades[3].special).toBe('6 jumps within 5 cells, -10% each');
    expect(thornbite.grades[0].damage).toBe('0.9% max HP');
    expect(thornbite.grades[0].special).toBe('poison 2% max HP/s for 4.0s, up to 4 stacks');
  });

  it('describes a chill that freezes and a vulnerability', () => {
    expect(
      describeGradeSpecial({
        damage: 10,
        range: 6,
        attackCooldownMs: 800,
        onHitEffects: [
          { effectId: 'chill', magnitude: 0.6, durationMs: 3000, freezeAtStacks: 3, freezeMs: 800 },
          { effectId: 'vulnerability', magnitude: 0.25, durationMs: 2000, damageKind: 'physical' },
        ],
      }),
    ).toBe(
      'chill 60% slower for 3.0s; every 3 hits freeze 0.8s; ' +
        'vulnerable +25% physical damage taken for 2.0s',
    );
  });

  it('maps an injected branch without touching shipped content', () => {
    const branch = mapTalentBranch(
      {
        id: 'test_tower_a',
        name: 'Test',
        description: 'A test branch.',
        grades: [
          {
            level: 4,
            upgradeCostGold: 150,
            stats: { damage: 30, range: 6, attackCooldownMs: 1200, splashRadius: 3 },
          },
        ],
      },
      DamageType.PHYSICAL,
    );

    expect(branch.grades).toEqual([
      {
        level: 4,
        upgradeCost: 150,
        damage: '30',
        range: '6',
        cooldown: '1.2s',
        special: 'splash 3 cells',
      },
    ]);
  });
});
