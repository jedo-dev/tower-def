import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './CreatureBranchChooserDialog.module.css';
import { useModalFocus } from '../../../shared/lib/modal-focus';
import { BranchGlyph } from '../../../shared/ui/branch-glyph';
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

type BranchCardProps = {
  branch: CreatureBranchCardViewModel;
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
      <table className={styles.grades} aria-label={`${branch.name} grades 1 to 4`}>
        <thead>
          <tr>
            <th scope="col">G</th>
            <th scope="col" title="Health vs base">
              HP
            </th>
            <th scope="col" title="Speed vs base">
              SPD
            </th>
            <th scope="col" title="Physical armor vs base">
              PHY
            </th>
            <th scope="col" title="Magical armor vs base">
              MAG
            </th>
            <th scope="col">Special</th>
          </tr>
        </thead>
        <tbody>
          {branch.rows.map((row) => (
            <tr key={row.grade}>
              <th scope="row">{row.grade}</th>
              <td>{row.healthDelta}</td>
              <td>{row.speedDelta}</td>
              <td>{row.physicalArmorDelta}</td>
              <td>{row.magicalArmorDelta}</td>
              <td className={styles.special}>{row.special}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.chooseBtn}`}
        aria-pressed={isSelected}
        aria-label={`Choose ${branch.name} for ${cost} XP`}
        disabled={!isAffordable}
        onClick={onSelect}
      >
        <span>{isSelected ? 'Selected' : 'Choose'}</span>
        <span className={styles.cost}>{cost} XP</span>
      </button>
    </article>
  );
}

/**
 * Picks the talent branch of a sendable creature. Choosing a card only marks
 * it; Confirm spends the tier's experience and locks the other branch for
 * the match. Mirrors the tower branch chooser.
 */
export function CreatureBranchChooserDialog({
  creatureName,
  develop,
  onConfirm,
  onCancel,
}: CreatureBranchChooserDialogProps) {
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
          Develop {creatureName}
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
          {formatCreatureBranchLockWarning(creatureName)}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.actionBtn}`}
            disabled={selectedBranch === undefined || !develop.isAffordable}
            aria-label={
              selectedBranch
                ? `Confirm ${selectedBranch.name} for ${develop.cost} XP`
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
            <span className={styles.cost}>{develop.cost} XP</span>
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
