import { describe, expect, it } from 'vitest';
import { loadTowerArchetypeContent, parseTowerContentFile } from './loadTowerContent';
import { buildableTowers } from '../config/buildableTowers';
import { resolveTowerUpgradeConfig } from '../upgrade';
import type { TowerTalentBranchDefinition } from './towerTalentContent';
import {
  TOWER_TALENT_GRADE_LEVELS,
  TowerTalentPricing,
} from '../../../../shared/constants/towerTalents';
import {
  createBaseLevelsFixture,
  createTalentBranchesFixture,
  createTalentGradesFixture,
} from './fixtures/talentBranchFixture';

const FILE = 'content/towers/undead.json';
const TOWER_ID = 'undead_bone_archer_tower';

function createTower(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TOWER_ID,
    name: 'Bone Archer Tower',
    archetype: 'single',
    costGold: 50,
    damage: 22,
    range: 6.4,
    attackCooldownMs: 800,
    spriteKey: 'tower.undead.bone_archer',
    description: 'Necromantic archer nest built from cursed remains.',
    talentBranches: createTalentBranchesFixture(TOWER_ID),
    ...overrides,
  };
}

function parseTower(overrides: Record<string, unknown> = {}, schemaVersion = 4) {
  return parseTowerContentFile({
    file: FILE,
    data: { schemaVersion, race: 'UNDEAD', towers: [createTower(overrides)] },
  })[0];
}

function branchesWith(changeFirst: (branch: Record<string, unknown>) => Record<string, unknown>) {
  const [first, second] = createTalentBranchesFixture(TOWER_ID);
  return [changeFirst(first), second];
}

describe('talent branch content', () => {
  it('reads both branches and prices every grade from the ladder', () => {
    const tower = parseTower();

    expect(tower.talentBranches.map((branch) => branch.id)).toEqual([
      `${TOWER_ID}_a`,
      `${TOWER_ID}_b`,
    ]);
    const [branch] = tower.talentBranches;
    expect(branch.name).toBe('Branch A');
    expect(branch.description).toBe('Test branch a.');
    expect(branch.grades.map((grade) => [grade.level, grade.upgradeCostGold])).toEqual(
      TOWER_TALENT_GRADE_LEVELS.map((level) => [level, TowerTalentPricing.GRADE_COSTS[level]]),
    );
    expect(branch.grades[0].stats).toEqual({ damage: 44, range: 6.4, attackCooldownMs: 700 });
  });

  it('reads a grade chain shape', () => {
    const chain = { bounces: 3, bounceRangeCells: 4, damageFalloff: 0.3 };
    const tower = parseTower({
      talentBranches: branchesWith((branch) => ({
        ...branch,
        grades: createTalentGradesFixture().map((grade) => ({ ...grade, chain })),
      })),
    });

    expect(tower.talentBranches[0].grades[3].stats.chain).toEqual(chain);
  });

  it('requires talent branches on every race tower', () => {
    expect(() => parseTower({ talentBranches: undefined })).toThrow(
      `${FILE} [${TOWER_ID}]: "talentBranches" must be an array`,
    );
  });

  it('requires exactly two branches', () => {
    const [first] = createTalentBranchesFixture(TOWER_ID);

    expect(() => parseTower({ talentBranches: [first] })).toThrow(
      `${FILE} [${TOWER_ID}]: "talentBranches" must list exactly 2 branches; found 1`,
    );
  });

  it('rejects two branches with the same id', () => {
    const [first] = createTalentBranchesFixture(TOWER_ID);

    expect(() => parseTower({ talentBranches: [first, { ...first }] })).toThrow(
      `${FILE} [${TOWER_ID}]: duplicate talent branch id "${TOWER_ID}_a"`,
    );
  });

  it('requires branch ids to start with the tower id', () => {
    expect(() =>
      parseTower({ talentBranches: branchesWith((branch) => ({ ...branch, id: 'volley' })) }),
    ).toThrow(`${FILE} [${TOWER_ID}/volley]: branch id must start with "${TOWER_ID}_"`);
  });

  it('requires grades 4-7 in order', () => {
    const reordered = branchesWith((branch) => ({
      ...branch,
      grades: createTalentGradesFixture().reverse(),
    }));
    const short = branchesWith((branch) => ({
      ...branch,
      grades: createTalentGradesFixture().slice(0, 3),
    }));

    expect(() => parseTower({ talentBranches: reordered })).toThrow(
      `${FILE} [${TOWER_ID}/${TOWER_ID}_a]: grades must be listed in order 4, 5, 6, 7; found 7 at position 1`,
    );
    expect(() => parseTower({ talentBranches: short })).toThrow(
      `${FILE} [${TOWER_ID}/${TOWER_ID}_a]: a branch must list grades 4, 5, 6, 7; found 3`,
    );
  });

  it('rejects an authored grade price, which comes from the ladder', () => {
    const priced = branchesWith((branch) => ({
      ...branch,
      grades: createTalentGradesFixture().map((grade) => ({ ...grade, upgradeCostGold: 1 })),
    }));

    expect(() => parseTower({ talentBranches: priced })).toThrow(/unknown field "upgradeCostGold"/);
  });

  it('rejects an ability modifier no combat mechanic declares', () => {
    const withAbility = branchesWith((branch) => ({
      ...branch,
      grades: createTalentGradesFixture().map((grade) => ({ ...grade, abilities: { typo: 1 } })),
    }));

    expect(() => parseTower({ talentBranches: withAbility })).toThrow(/unknown field "typo"/);
  });

  it('rejects a version 3 file with the migration steps', () => {
    expect(() => parseTower({}, 3)).toThrow(
      `${FILE} [${TOWER_ID}]: schemaVersion 3 has no talent branches; add "talentBranches"`,
    );
  });

  it('rejects a level curve that does not end at grade 3', () => {
    expect(() => parseTower({ levels: createBaseLevelsFixture().slice(0, 2) })).toThrow(
      `${FILE} [${TOWER_ID}]: a level curve must list levels 1-3, talent branches add the grades above; found 2 levels`,
    );
    expect(() =>
      loadTowerArchetypeContent({
        file: 'content/towers/archetypes.json',
        data: {
          schemaVersion: 4,
          archetypes: [
            {
              id: 'single',
              name: 'Archer',
              attackKind: 'single-target',
              damageType: 'physical',
              damage: 20,
              range: 6,
              attackCooldownMs: 800,
              levels: [...createBaseLevelsFixture(), { ...createBaseLevelsFixture()[2], level: 4 }],
              description: 'Single target.',
            },
          ],
        },
      }),
    ).toThrow('content/towers/archetypes.json [single]: a level curve must list levels 1-3');
  });
});

const AURA_MECHANIC_KEYS = [
  'damagePercentBonus',
  'goldPerKill',
  'incomePerRound',
  'sellRefundBonus',
] as const;

/**
 * The mechanics a branch uses, ignoring numbers: ability keys, on-hit effects
 * (with their armor or damage kind) and the aura extensions it grants.
 */
function branchMechanics(branch: TowerTalentBranchDefinition): Set<string> {
  const mechanics = new Set<string>();

  for (const { stats } of branch.grades) {
    for (const key of Object.keys(stats.abilities ?? {})) {
      mechanics.add(`ability:${key}`);
    }
    for (const effect of stats.onHitEffects ?? []) {
      const kind = effect.armorKind ?? effect.damageKind ?? '';
      mechanics.add(`effect:${effect.effectId}:${kind}`);
    }
    for (const key of AURA_MECHANIC_KEYS) {
      if ((stats.aura?.[key] ?? 0) > 0) {
        mechanics.add(`aura:${key}`);
      }
    }
  }

  return mechanics;
}

describe('shipped talent branches', () => {
  it('gives every race tower two branches that differ in a mechanic, not only in numbers', () => {
    for (const tower of buildableTowers) {
      const [first, second] = tower.talentBranches.map(branchMechanics);
      const onlyInOne = [...first, ...second].filter(
        (mechanic) => !first.has(mechanic) || !second.has(mechanic),
      );

      expect(onlyInOne.length, tower.id).toBeGreaterThan(0);
    }
  });

  it('replaces every placeholder branch with an authored one', () => {
    for (const tower of buildableTowers) {
      for (const branch of tower.talentBranches) {
        expect(branch.name, branch.id).not.toMatch(/ I{1,2}$/);
        expect(branch.description, branch.id).not.toMatch(/placeholder/i);
      }
    }
  });

  it('gives every race tower two branches that extend its grade 3 stats', () => {
    for (const tower of buildableTowers) {
      const gradeThree = resolveTowerUpgradeConfig({
        type: tower.towerType,
        buildableTowerId: tower.id,
      }).levels[2].stats;

      expect(tower.talentBranches, tower.id).toHaveLength(2);
      for (const branch of tower.talentBranches) {
        expect(
          branch.grades.map((grade) => grade.level),
          branch.id,
        ).toEqual([...TOWER_TALENT_GRADE_LEVELS]);
        expect(branch.grades[0].stats.damage, branch.id).toBeGreaterThanOrEqual(gradeThree.damage);
        expect(branch.grades[0].stats.range, branch.id).toBeGreaterThanOrEqual(gradeThree.range);
      }
    }
  });
});
