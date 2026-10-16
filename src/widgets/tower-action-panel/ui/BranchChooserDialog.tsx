import {
  BranchChooserDialog as SharedBranchChooserDialog,
  type BranchChooserCard,
  type BranchGradeColumn,
} from '../../../shared/ui/branch-chooser';
import {
  formatBranchLockWarning,
  type TalentBranchCardViewModel,
  type TowerDevelopViewModel,
} from '../model/mapTowerBranchState';

export type BranchChooserDialogProps = {
  towerName: string;
  develop: TowerDevelopViewModel;
  onConfirm: (branchId: string) => void;
  onCancel: () => void;
};

const TOWER_GRADE_COLUMNS: readonly BranchGradeColumn[] = [
  { label: 'DMG', title: 'Damage vs level 3' },
  { label: 'RNG', title: 'Range vs level 3' },
  { label: 'SPD', title: 'Attack cooldown vs level 3' },
];

function toBranchChooserCard(
  branch: TalentBranchCardViewModel,
  develop: TowerDevelopViewModel,
): BranchChooserCard {
  return {
    id: branch.id,
    name: branch.name,
    description: branch.description,
    glyph: branch.glyph,
    price: { label: `$${develop.cost}`, accessibleLabel: `${develop.cost} gold` },
    isDisabled: !develop.isAffordable,
    grades: {
      ariaLabel: `${branch.name} grades 4 to 7`,
      gradeColumnLabel: 'Lv',
      statColumns: TOWER_GRADE_COLUMNS,
      specialColumnLabel: 'Special',
      rows: branch.rows.map((row) => ({
        grade: row.level,
        stats: [row.damageDelta, row.rangeDelta, row.cooldownDelta],
        special: row.special,
      })),
    },
  };
}

/**
 * Picks the talent branch of a grade-3 tower's type. Choosing a card only
 * marks it; Confirm pays and locks the other branch for the match.
 */
export function BranchChooserDialog({
  towerName,
  develop,
  onConfirm,
  onCancel,
}: BranchChooserDialogProps) {
  return (
    <SharedBranchChooserDialog
      title={`Develop ${towerName}`}
      cards={develop.branches.map((branch) => toBranchChooserCard(branch, develop))}
      lockWarning={formatBranchLockWarning(towerName)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
