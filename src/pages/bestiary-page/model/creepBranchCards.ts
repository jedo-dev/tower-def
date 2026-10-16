import type { CreatureTalentBranchDefinition } from '../../../entities/unit';
import { toBranchGlyph } from '../../../shared/ui/branch-glyph';
import { describeCreatureAbilities } from './creatureAbilityLines';
import type { CreepBranchViewModel } from './types';

/**
 * Creature talent branches on the bestiary card: one row per grade 1-4 with
 * health, speed and both armors, plus a plain-language line of the grade's
 * abilities.
 */
export function mapCreatureBranch(
  branch: CreatureTalentBranchDefinition,
  branchIndex: number,
): CreepBranchViewModel {
  return {
    id: branch.id,
    name: branch.name,
    glyph: toBranchGlyph(branchIndex),
    description: branch.description,
    grades: branch.grades.map((grade) => ({
      level: grade.level,
      health: grade.health,
      speed: grade.speed,
      physicalArmor: grade.physicalArmor,
      magicalArmor: grade.magicalArmor,
      special: describeCreatureAbilities(grade.abilities),
    })),
  };
}

export function mapCreatureBranches(
  branches: readonly CreatureTalentBranchDefinition[],
): CreepBranchViewModel[] {
  return branches.map(mapCreatureBranch);
}
