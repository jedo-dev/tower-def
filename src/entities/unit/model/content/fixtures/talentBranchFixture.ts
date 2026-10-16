import { CREATURE_TALENT_GRADE_LEVELS } from '../../../../../shared/constants/creatureTalents';

/** Authored grade 1-4 entries with simple rising numbers, for loader tests. */
export function createTalentGradesFixture(): Record<string, unknown>[] {
  return CREATURE_TALENT_GRADE_LEVELS.map((level) => ({
    level,
    health: 100 + level * 10,
    speed: 1 + level / 10,
    physicalArmor: level,
    magicalArmor: 0,
  }));
}

/** The two branches every creature must author since unit schema v4. */
export function createTalentBranches(unitId: string): Record<string, unknown>[] {
  return ['a', 'b'].map((suffix) => ({
    id: `${unitId}_${suffix}`,
    name: `Branch ${suffix.toUpperCase()}`,
    description: `Test branch ${suffix}.`,
    grades: createTalentGradesFixture(),
  }));
}
