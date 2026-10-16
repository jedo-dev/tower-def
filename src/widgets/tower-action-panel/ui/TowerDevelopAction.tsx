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
 * answers with the error sound instead of silence.
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
        className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.actionBtn} ${isBlocked ? styles.actionBtnBlocked : ''}`}
        aria-disabled={isBlocked || undefined}
        aria-haspopup="dialog"
        aria-label={`Develop tower: choose a branch for ${develop.cost} gold`}
        aria-describedby={isBlocked ? reasonId : undefined}
        data-sound={isBlocked ? 'ui.error' : 'ui.open'}
        onClick={handleOpen}
      >
        <span>Develop</span>
        <span className={styles.btnCost}>${develop.cost}</span>
      </button>
      {develop.blockedReason !== null && (
        <p id={reasonId} className={styles.blockedReason}>
          {develop.blockedReason}
        </p>
      )}
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
