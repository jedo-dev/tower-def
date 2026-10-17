import {
  BranchChooserDialog,
  type BranchChooserCard,
  type BranchGradeColumn,
} from '../../../shared/ui/branch-chooser';
import {
  formatCreatureBranchLockWarning,
  type CreatureBranchCardViewModel,
  type CreatureDevelopActionViewModel,
} from '../model/mapCreatureTalentState';

export type CreatureBranchChooserDialogProps = {
  creatureName: string;
  develop: CreatureDevelopActionViewModel;
  onConfirm: (branchId: string) => void;
  onCancel: () => void;
};

const CREATURE_GRADE_COLUMNS: readonly BranchGradeColumn[] = [
  { label: 'HP', title: 'Health vs base' },
  { label: 'SPD', title: 'Speed vs base' },
  { label: 'PHY', title: 'Physical armor vs base' },
  { label: 'MAG', title: 'Magical armor vs base' },
];

function toBranchChooserCard(
  branch: CreatureBranchCardViewModel,
  develop: CreatureDevelopActionViewModel,
): BranchChooserCard {
  return {
    id: branch.id,
    name: branch.name,
    description: branch.description,
    glyph: branch.glyph,
    price: { label: `${develop.cost} XP`, accessibleLabel: `${develop.cost} XP` },
    isDisabled: !develop.isAffordable,
    disabledReason: develop.blockedReason ?? undefined,
    grades: {
      ariaLabel: `${branch.name} grades 1 to 4`,
      gradeColumnLabel: 'Grade',
      statColumns: CREATURE_GRADE_COLUMNS,
      specialColumnLabel: 'Special',
      rows: branch.rows.map((row) => ({
        grade: row.grade,
        stats: [row.healthDelta, row.speedDelta, row.physicalArmorDelta, row.magicalArmorDelta],
        special: row.special,
      })),
    },
  };
}

/**
 * Picks the talent branch of a sendable creature. Choosing a card only marks
 * it; Confirm spends the tier's experience and locks the other branch for
 * the match.
 */
export function CreatureBranchChooserDialog({
  creatureName,
  develop,
  onConfirm,
  onCancel,
}: CreatureBranchChooserDialogProps) {
  return (
    <BranchChooserDialog
      title={`Develop ${creatureName}`}
      cards={develop.branches.map((branch) => toBranchChooserCard(branch, develop))}
      lockWarning={formatCreatureBranchLockWarning(creatureName)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
