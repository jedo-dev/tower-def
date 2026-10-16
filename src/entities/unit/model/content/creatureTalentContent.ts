import {
  ContentValidationError,
  assertKnownKeys,
  readArray,
  readBoundedInteger,
  readNumber,
  readRecord,
  readString,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  CREATURE_TALENT_GRADE_LEVELS,
  CreatureTalentRule,
  type CreatureTalentGradeLevel,
} from '../../../../shared/constants/creatureTalents';
import type { CreatureAbilities } from '../abilities';
import { parseCreatureAbilities } from './creatureAbilityFields';
import {
  UNIT_ARMOR_BOUNDS,
  UNIT_STAT_BOUNDS,
  UNIT_TALENT_BRANCH_KEYS,
  UNIT_TALENT_GRADE_KEYS,
} from './unitContent.types';

/** The stats a grade replaces on a sent creature; grade 0 is the authored base. */
export type CreatureGradeStats = {
  health: number;
  speed: number;
  physicalArmor: number;
  magicalArmor: number;
  abilities?: CreatureAbilities;
};

export type CreatureTalentGradeDefinition = CreatureGradeStats & {
  level: CreatureTalentGradeLevel;
};

/** A creature talent branch as the game reads it: grades 1-4 in order. */
export type CreatureTalentBranchDefinition = {
  id: string;
  name: string;
  description: string;
  grades: readonly CreatureTalentGradeDefinition[];
};

function parseGrade(
  rawGrade: unknown,
  index: number,
  location: ContentLocation,
): CreatureTalentGradeDefinition {
  const grade = readRecord(rawGrade, location);
  assertKnownKeys(grade, UNIT_TALENT_GRADE_KEYS, location);

  const expectedLevel = CREATURE_TALENT_GRADE_LEVELS[index];
  const declaredLevel = readNumber(grade, 'level', location);

  if (declaredLevel !== expectedLevel) {
    throw new ContentValidationError(
      location,
      `grades must be listed in order ${CREATURE_TALENT_GRADE_LEVELS.join(', ')}; ` +
        `found ${declaredLevel} at position ${index + 1}`,
    );
  }

  const abilities = parseCreatureAbilities(grade, location);

  return {
    level: expectedLevel,
    health: readNumber(grade, 'health', location, UNIT_STAT_BOUNDS.health),
    speed: readNumber(grade, 'speed', location, UNIT_STAT_BOUNDS.speed),
    physicalArmor: readBoundedInteger(
      grade,
      'physicalArmor',
      location,
      UNIT_ARMOR_BOUNDS.physicalArmor,
    ),
    magicalArmor: readBoundedInteger(
      grade,
      'magicalArmor',
      location,
      UNIT_ARMOR_BOUNDS.magicalArmor,
    ),
    ...(abilities === undefined ? {} : { abilities }),
  };
}

function parseBranch(
  rawBranch: unknown,
  unitLocation: ContentLocation,
  unitId: string,
): CreatureTalentBranchDefinition {
  const branch = readRecord(rawBranch, unitLocation);
  const id = readString(branch, 'id', unitLocation);
  const location: ContentLocation = { file: unitLocation.file, entityId: `${unitId}/${id}` };

  assertKnownKeys(branch, UNIT_TALENT_BRANCH_KEYS, location);

  if (!id.startsWith(`${unitId}_`)) {
    throw new ContentValidationError(location, `branch id must start with "${unitId}_"`);
  }

  const rawGrades = readArray(branch, 'grades', location);

  if (rawGrades.length !== CREATURE_TALENT_GRADE_LEVELS.length) {
    throw new ContentValidationError(
      location,
      `a branch must list grades ${CREATURE_TALENT_GRADE_LEVELS.join(', ')}; found ${rawGrades.length}`,
    );
  }

  return {
    id,
    name: readString(branch, 'name', location),
    description: readString(branch, 'description', location),
    grades: rawGrades.map((rawGrade, index) => parseGrade(rawGrade, index, location)),
  };
}

/**
 * `talentBranches` of a creature: exactly two branches with distinct ids, each
 * listing grades 1-4 in order. Experience prices come from
 * `CreatureTalentPricing` (content cannot declare them).
 */
export function parseCreatureTalentBranches(
  entry: Record<string, unknown>,
  location: ContentLocation,
  unitId: string,
): readonly CreatureTalentBranchDefinition[] {
  const rawBranches = readArray(entry, 'talentBranches', location);

  if (rawBranches.length !== CreatureTalentRule.BRANCH_COUNT) {
    throw new ContentValidationError(
      location,
      `"talentBranches" must list exactly ${CreatureTalentRule.BRANCH_COUNT} branches; found ${rawBranches.length}`,
    );
  }

  const branches = rawBranches.map((rawBranch) => parseBranch(rawBranch, location, unitId));
  const [first, second] = branches;

  if (first.id === second.id) {
    throw new ContentValidationError(location, `duplicate talent branch id "${first.id}"`);
  }

  return branches;
}
