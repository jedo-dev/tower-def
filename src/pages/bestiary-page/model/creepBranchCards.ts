import type { CreatureTalentBranchDefinition } from '../../../entities/unit';
import { toBranchGlyph } from '../../../shared/ui/branch-glyph';
import { describeCreatureAbilities } from './creatureAbilityLines';
import { creatureBodyReadings, type CreatureBodyNumbers } from './statReadings';
import type { CreepBranchViewModel } from './types';

/**
 * Creature talent branches in the codex: one entry per grade 1-4 with
 * health, speed and both armors (each with a delta against the grade before,
 * grade 1 against the creature's base body), plus a plain-language line of
 * the grade's abilities.
 */
export function mapCreatureBranch(
  branch: CreatureTalentBranchDefinition,
  branchIndex: number,
  base: CreatureBodyNumbers,
): CreepBranchViewModel {
  let previous = { label: 'base', body: base };
  const grades = branch.grades.map((grade) => {
    const mapped = {
      level: grade.level,
      health: grade.health,
      speed: grade.speed,
      physicalArmor: grade.physicalArmor,
      magicalArmor: grade.magicalArmor,
      stats: creatureBodyReadings(grade, previous.body),
      comparedTo: previous.label,
      special: describeCreatureAbilities(grade.abilities),
    };
    previous = { label: `G${grade.level}`, body: grade };
    return mapped;
  });

  return {
    id: branch.id,
    name: branch.name,
    glyph: toBranchGlyph(branchIndex),
    description: branch.description,
    grades,
  };
}

export function mapCreatureBranches(
  branches: readonly CreatureTalentBranchDefinition[],
  base: CreatureBodyNumbers,
): CreepBranchViewModel[] {
  return branches.map((branch, branchIndex) => mapCreatureBranch(branch, branchIndex, base));
}
