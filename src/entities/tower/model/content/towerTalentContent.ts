import {
  ContentValidationError,
  assertKnownKeys,
  readArray,
  readNumber,
  readRecord,
  readString,
  type ContentLocation,
} from '../../../../shared/lib/content/contentValidation';
import {
  TOWER_TALENT_GRADE_LEVELS,
  TowerTalentPricing,
  TowerTalentRule,
} from '../../../../shared/constants/towerTalents';
import type { TowerUpgradeLevel } from '../upgradeConfig';
import {
  TOWER_GRADE_ABILITY_BOUNDS,
  TOWER_GRADE_ABILITY_KEYS,
  TOWER_TALENT_BRANCH_KEYS,
  TOWER_TALENT_GRADE_KEYS,
} from './towerContent.types';
import { parseChain, parseLevelStats } from './towerContentFields';

/** A talent branch as the game reads it: grades 4-7, priced from the ladder. */
export type TowerTalentBranchDefinition = {
  id: string;
  name: string;
  description: string;
  grades: readonly TowerUpgradeLevel[];
};

function parseAbilities(
  grade: Record<string, unknown>,
  location: ContentLocation,
): Readonly<Record<string, number>> | undefined {
  if (grade.abilities === undefined) {
    return undefined;
  }

  const abilities = readRecord(grade.abilities, location);
  assertKnownKeys(abilities, TOWER_GRADE_ABILITY_KEYS, location);

  return Object.fromEntries(
    Object.keys(abilities).map((key) => [
      key,
      readNumber(abilities, key, location, TOWER_GRADE_ABILITY_BOUNDS),
    ]),
  );
}

function parseGrade(
  rawGrade: unknown,
  index: number,
  location: ContentLocation,
): TowerUpgradeLevel {
  const grade = readRecord(rawGrade, location);
  assertKnownKeys(grade, TOWER_TALENT_GRADE_KEYS, location);

  const expectedLevel = TOWER_TALENT_GRADE_LEVELS[index];
  const declaredLevel = readNumber(grade, 'level', location);

  if (declaredLevel !== expectedLevel) {
    throw new ContentValidationError(
      location,
      `grades must be listed in order ${TOWER_TALENT_GRADE_LEVELS.join(', ')}; ` +
        `found ${declaredLevel} at position ${index + 1}`,
    );
  }

  const chain = parseChain(grade, location);
  const abilities = parseAbilities(grade, location);

  return {
    level: expectedLevel,
    upgradeCostGold: TowerTalentPricing.GRADE_COSTS[expectedLevel],
    stats: {
      ...parseLevelStats(grade, location),
      ...(chain === undefined ? {} : { chain }),
      ...(abilities === undefined ? {} : { abilities }),
    },
  };
}

function parseBranch(
  rawBranch: unknown,
  towerLocation: ContentLocation,
  towerId: string,
): TowerTalentBranchDefinition {
  const branch = readRecord(rawBranch, towerLocation);
  const id = readString(branch, 'id', towerLocation);
  const location: ContentLocation = {
    file: towerLocation.file,
    entityId: `${towerId}/${id}`,
  };

  assertKnownKeys(branch, TOWER_TALENT_BRANCH_KEYS, location);

  if (!id.startsWith(`${towerId}_`)) {
    throw new ContentValidationError(location, `branch id must start with "${towerId}_"`);
  }

  const rawGrades = readArray(branch, 'grades', location);

  if (rawGrades.length !== TOWER_TALENT_GRADE_LEVELS.length) {
    throw new ContentValidationError(
      location,
      `a branch must list grades ${TOWER_TALENT_GRADE_LEVELS.join(', ')}; found ${rawGrades.length}`,
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
 * `talentBranches` of a race tower: exactly two branches with distinct ids,
 * each listing grades 4-7 in order. Grade costs come from `TowerTalentPricing`
 * (content cannot declare them), so every tower climbs the same ladder.
 */
export function parseTalentBranches(
  entry: Record<string, unknown>,
  location: ContentLocation,
  towerId: string,
): readonly TowerTalentBranchDefinition[] {
  const rawBranches = readArray(entry, 'talentBranches', location);

  if (rawBranches.length !== TowerTalentRule.BRANCH_COUNT) {
    throw new ContentValidationError(
      location,
      `"talentBranches" must list exactly ${TowerTalentRule.BRANCH_COUNT} branches; found ${rawBranches.length}`,
    );
  }

  const branches = rawBranches.map((rawBranch) => parseBranch(rawBranch, location, towerId));
  const [first, second] = branches;

  if (first.id === second.id) {
    throw new ContentValidationError(location, `duplicate talent branch id "${first.id}"`);
  }

  return branches;
}
