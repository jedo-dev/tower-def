import { TOWER_TALENT_GRADE_LEVELS } from '../../../../../shared/constants/towerTalents';

/** Authored grade 4-7 entries with simple rising numbers, for loader tests. */
export function createTalentGradesFixture(): Record<string, unknown>[] {
  return TOWER_TALENT_GRADE_LEVELS.map((level) => ({
    level,
    damage: 40 + level,
    range: 6 + level / 10,
    attackCooldownMs: 700,
  }));
}

/** A base curve of levels 1-3, the only length a curve may have since schema v4. */
export function createBaseLevelsFixture(): Record<string, unknown>[] {
  return [
    { level: 1, upgradeCostGold: 0, damage: 20, range: 6, attackCooldownMs: 800 },
    { level: 2, upgradeCostGold: 40, damage: 30, range: 6.4, attackCooldownMs: 750 },
    { level: 3, upgradeCostGold: 80, damage: 40, range: 6.8, attackCooldownMs: 700 },
  ];
}

/** The two branches every race tower must author since tower schema v4. */
export function createTalentBranchesFixture(towerId: string): Record<string, unknown>[] {
  return ['a', 'b'].map((suffix) => ({
    id: `${towerId}_${suffix}`,
    name: `Branch ${suffix.toUpperCase()}`,
    description: `Test branch ${suffix}.`,
    grades: createTalentGradesFixture(),
  }));
}
