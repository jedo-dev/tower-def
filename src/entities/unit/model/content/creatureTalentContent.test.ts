import { describe, expect, it } from 'vitest';
import { CREATURE_TALENT_GRADE_LEVELS } from '../../../../shared/constants/creatureTalents';
import { getAllUnitConfigs } from '../registry';
import { parseUnitContentFile } from './loadUnitContent';
import { createTalentBranches, createTalentGradesFixture } from './fixtures/talentBranchFixture';

const FILE = 'content/units/undead.json';
const UNIT_ID = 'undead_skeleton';

function createEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: UNIT_ID,
    name: 'Skeleton',
    tier: 1,
    health: 50,
    speed: 1.3,
    physicalArmor: 0,
    magicalArmor: 0,
    damage: 12,
    rewardGold: 6,
    spriteKey: 'unit.undead.skeleton',
    talentBranches: createTalentBranches(UNIT_ID),
    ...overrides,
  };
}

function parseUnit(overrides: Record<string, unknown> = {}) {
  return parseUnitContentFile({
    file: FILE,
    data: { schemaVersion: 4, race: 'UNDEAD', units: [createEntry(overrides)] },
  })[0];
}

function branchesWith(changeFirst: (branch: Record<string, unknown>) => Record<string, unknown>) {
  const [first, second] = createTalentBranches(UNIT_ID);
  return [changeFirst(first), second];
}

function gradesWith(changeFirst: (grade: Record<string, unknown>) => Record<string, unknown>) {
  const [first, ...rest] = createTalentGradesFixture();
  return [changeFirst(first), ...rest];
}

describe('creature talent branch content', () => {
  it('reads both branches with grades 1-4 in order', () => {
    const unit = parseUnit();

    expect(unit.talentBranches.map((branch) => branch.id)).toEqual([
      'undead_skeleton_a',
      'undead_skeleton_b',
    ]);
    expect(unit.talentBranches[0].grades).toEqual([
      { level: 1, health: 110, speed: 1.1, physicalArmor: 1, magicalArmor: 0 },
      { level: 2, health: 120, speed: 1.2, physicalArmor: 2, magicalArmor: 0 },
      { level: 3, health: 130, speed: 1.3, physicalArmor: 3, magicalArmor: 0 },
      { level: 4, health: 140, speed: 1.4, physicalArmor: 4, magicalArmor: 0 },
    ]);
  });

  it('accepts an empty abilities object and drops it', () => {
    const unit = parseUnit({
      talentBranches: branchesWith((branch) => ({
        ...branch,
        grades: gradesWith((grade) => ({ ...grade, abilities: {} })),
      })),
    });

    expect(unit.talentBranches[0].grades[0].abilities).toBeUndefined();
  });

  it('reads grade abilities with the creature abilities parser', () => {
    const unit = parseUnit({
      talentBranches: branchesWith((branch) => ({
        ...branch,
        grades: gradesWith((grade) => ({ ...grade, abilities: { dodgeEveryNthShot: 4 } })),
      })),
    });

    expect(unit.talentBranches[0].grades[0].abilities).toEqual({ dodgeEveryNthShot: 4 });
  });

  it('rejects an unknown ability naming the unit and branch', () => {
    expect(() =>
      parseUnit({
        talentBranches: branchesWith((branch) => ({
          ...branch,
          grades: gradesWith((grade) => ({ ...grade, abilities: { flight: 1 } })),
        })),
      }),
    ).toThrow(`${FILE} [undead_skeleton/undead_skeleton_a]: unknown field "flight"`);
  });

  it('requires exactly two branches', () => {
    expect(() => parseUnit({ talentBranches: createTalentBranches(UNIT_ID).slice(0, 1) })).toThrow(
      `${FILE} [undead_skeleton]: "talentBranches" must list exactly 2 branches; found 1`,
    );
    expect(() => parseUnit({ talentBranches: undefined })).toThrow(
      `${FILE} [undead_skeleton]: "talentBranches" must be an array`,
    );
  });

  it('rejects a branch id that does not start with the unit id', () => {
    expect(() =>
      parseUnit({ talentBranches: branchesWith((branch) => ({ ...branch, id: 'bone_wall' })) }),
    ).toThrow(`${FILE} [undead_skeleton/bone_wall]: branch id must start with "undead_skeleton_"`);
  });

  it('rejects duplicate branch ids', () => {
    const [first] = createTalentBranches(UNIT_ID);

    expect(() => parseUnit({ talentBranches: [first, first] })).toThrow(
      `${FILE} [undead_skeleton]: duplicate talent branch id "undead_skeleton_a"`,
    );
  });

  it('requires grades 1-4 in order', () => {
    expect(() =>
      parseUnit({
        talentBranches: branchesWith((branch) => ({
          ...branch,
          grades: createTalentGradesFixture().slice(0, 3),
        })),
      }),
    ).toThrow(
      `${FILE} [undead_skeleton/undead_skeleton_a]: a branch must list grades 1, 2, 3, 4; found 3`,
    );
    expect(() =>
      parseUnit({
        talentBranches: branchesWith((branch) => ({
          ...branch,
          grades: gradesWith((grade) => ({ ...grade, level: 2 })),
        })),
      }),
    ).toThrow('grades must be listed in order 1, 2, 3, 4; found 2 at position 1');
  });

  it('validates grade stats with the creature bounds and rejects unknown grade fields', () => {
    expect(() =>
      parseUnit({
        talentBranches: branchesWith((branch) => ({
          ...branch,
          grades: gradesWith((grade) => ({ ...grade, physicalArmor: 1.5 })),
        })),
      }),
    ).toThrow(
      `${FILE} [undead_skeleton/undead_skeleton_a]: "physicalArmor" must be a whole number, got 1.5`,
    );
    expect(() =>
      parseUnit({
        talentBranches: branchesWith((branch) => ({
          ...branch,
          grades: gradesWith((grade) => ({ ...grade, rewardGold: 3 })),
        })),
      }),
    ).toThrow(`${FILE} [undead_skeleton/undead_skeleton_a]: unknown field "rewardGold"`);
  });
});

describe('shipped creature talent branches', () => {
  it('give every creature two branches of four grades', () => {
    for (const unit of getAllUnitConfigs()) {
      expect(unit.talentBranches, unit.id).toHaveLength(2);
      for (const branch of unit.talentBranches) {
        expect(
          branch.grades.map((grade) => grade.level),
          branch.id,
        ).toEqual([...CREATURE_TALENT_GRADE_LEVELS]);
      }
    }
  });

  it('keep grade 4 health within +40% of the base (docs/12, "Чего тут нет намеренно")', () => {
    for (const unit of getAllUnitConfigs()) {
      for (const branch of unit.talentBranches) {
        expect(branch.grades[3].health, branch.id).toBeLessThanOrEqual(unit.health * 1.4);
      }
    }
  });
});
