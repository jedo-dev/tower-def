import {
  BranchChooserDialog as SharedBranchChooserDialog,
  type BranchChooserCard,
  type BranchChooserCountdown,
  type BranchGradeColumn,
} from '../../../shared/ui/branch-chooser';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
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

const SECONDS_PER_MINUTE = 60;

/** The HUD's build-phase auto-start timer as the chooser's header chip, e.g. "0:21". */
function toAutoStartCountdown(secondsLeft: number): BranchChooserCountdown {
  const safeSeconds = Math.max(0, Math.ceil(secondsLeft));
  const minutes = Math.floor(safeSeconds / SECONDS_PER_MINUTE);
  const seconds = safeSeconds % SECONDS_PER_MINUTE;
  return {
    label: `${minutes}:${String(seconds).padStart(2, '0')}`,
    accessibleLabel: `Build phase ends in ${safeSeconds} seconds`,
  };
}

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
    disabledReason: develop.blockedReason ?? undefined,
    grades: {
      ariaLabel: `${branch.name} grades 4 to 7`,
      gradeColumnLabel: 'Grade',
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
  const { autoStartSecondsLeft } = useGameHudSnapshot();

  return (
    <SharedBranchChooserDialog
      title={`Develop ${towerName}`}
      countdown={
        autoStartSecondsLeft === null ? undefined : toAutoStartCountdown(autoStartSecondsLeft)
      }
      cards={develop.branches.map((branch) => toBranchChooserCard(branch, develop))}
      lockWarning={formatBranchLockWarning(towerName)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
