import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './BranchChooserDialog.module.css';
import { useModalFocus } from '../../../shared/lib/modal-focus';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
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

type BranchCardProps = {
  branch: TalentBranchCardViewModel;
  cost: number;
  isSelected: boolean;
  isAffordable: boolean;
  onSelect: () => void;
};

function BranchCard({ branch, cost, isSelected, isAffordable, onSelect }: BranchCardProps) {
  const titleId = useId();

  return (
    <article
      className={isSelected ? `${styles.card} ${styles.cardSelected}` : styles.card}
      aria-labelledby={titleId}
    >
      <header className={styles.cardHeader}>
        <BranchGlyph glyph={branch.glyph} />
        <h3 id={titleId} className={styles.cardTitle}>
          {branch.name}
        </h3>
      </header>
      <p className={styles.cardDescription}>{branch.description}</p>
      <table className={styles.grades} aria-label={`${branch.name} grades 4 to 7`}>
        <thead>
          <tr>
            <th scope="col">Lv</th>
            <th scope="col" title="Damage vs level 3">
              DMG
            </th>
            <th scope="col" title="Range vs level 3">
              RNG
            </th>
            <th scope="col" title="Attack cooldown vs level 3">
              SPD
            </th>
            <th scope="col">Special</th>
          </tr>
        </thead>
        <tbody>
          {branch.rows.map((row) => (
            <tr key={row.level}>
              <th scope="row">{row.level}</th>
              <td>{row.damageDelta}</td>
              <td>{row.rangeDelta}</td>
              <td>{row.cooldownDelta}</td>
              <td className={styles.special}>{row.special}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.chooseBtn}`}
        aria-pressed={isSelected}
        aria-label={`Choose ${branch.name} for ${cost} gold`}
        disabled={!isAffordable}
        onClick={onSelect}
      >
        <span>{isSelected ? 'Chosen' : 'Choose'}</span>
        <span className={styles.cost}>${cost}</span>
      </button>
    </article>
  );
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const warningId = useId();
  const modalFocus = useModalFocus(dialogRef, true);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const selectedBranch = develop.branches.find((branch) => branch.id === selectedBranchId);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    modalFocus.onKeyDown(event);
  };

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={warningId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className={`ui-panel ${styles.dialog}`}>
        <h2 id={titleId} className={styles.title}>
          Develop {towerName}
        </h2>
        <div className={styles.cards}>
          {develop.branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              cost={develop.cost}
              isSelected={branch.id === selectedBranchId}
              isAffordable={develop.isAffordable}
              onSelect={() => setSelectedBranchId(branch.id)}
            />
          ))}
        </div>
        <p id={warningId} className={styles.warning}>
          {formatBranchLockWarning(towerName)}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.actionBtn}`}
            disabled={selectedBranch === undefined || !develop.isAffordable}
            aria-label={
              selectedBranch
                ? `Confirm ${selectedBranch.name} for ${develop.cost} gold`
                : 'Confirm branch'
            }
            data-sound="ui.success"
            onClick={() => {
              if (selectedBranch) {
                onConfirm(selectedBranch.id);
              }
            }}
          >
            <span>Confirm</span>
            <span className={styles.cost}>${develop.cost}</span>
          </button>
          <button
            type="button"
            className={`fantasy-button fantasy-button--ghost fantasy-button--compact ${styles.actionBtn}`}
            data-sound="ui.close"
            onClick={onCancel}
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
