import { useId, useState } from 'react';
import styles from './TowerActionPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import type { TowerDevelopViewModel } from '../model/mapTowerBranchState';
import { BranchChooserDialog } from './BranchChooserDialog';

export type TowerDevelopActionProps = {
  towerId: string;
  towerName: string;
  develop: TowerDevelopViewModel;
};

/**
 * The grade-3 "Develop" button and the branch chooser it opens. Unaffordable,
 * it stays focusable (aria-disabled) so the reason is read out and a tap
 * answers with the error sound instead of silence. The reason sits under the
 * label inside the 44px button: the sheet has no spare row for it.
 */
export function TowerDevelopAction({ towerId, towerName, develop }: TowerDevelopActionProps) {
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const reasonId = useId();
  const isBlocked = !develop.isAffordable;

  function handleOpen(): void {
    if (!isBlocked) {
      setIsChooserOpen(true);
    }
  }

  function handleConfirm(branchId: string): void {
    setIsChooserOpen(false);
    sendGameCommand('choose-tower-branch', { towerId, branchId });
  }

  return (
    <>
      <button
        type="button"
        className={`fantasy-button fantasy-button--steel ${styles.actionBtn} ${styles.developBtn} ${isBlocked ? styles.actionBtnBlocked : ''}`}
        aria-disabled={isBlocked || undefined}
        aria-haspopup="dialog"
        aria-label={`Develop tower: choose a branch for ${develop.cost} gold`}
        aria-describedby={isBlocked ? reasonId : undefined}
        data-sound={isBlocked ? 'ui.error' : 'ui.open'}
        onClick={handleOpen}
      >
        <span className={styles.actionLabel}>Develop ${develop.cost}</span>
        {develop.blockedReason !== null && (
          <span id={reasonId} className={styles.actionReason}>
            {develop.blockedReason}
          </span>
        )}
      </button>
      {isChooserOpen && (
        <BranchChooserDialog
          towerName={towerName}
          develop={develop}
          onConfirm={handleConfirm}
          onCancel={() => setIsChooserOpen(false)}
        />
      )}
    </>
  );
}
