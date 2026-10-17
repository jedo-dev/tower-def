import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './BranchChooserDialog.module.css';
import { useModalFocus } from '../../../lib/modal-focus';
import type { BranchChooserCard, BranchChooserDialogProps } from '../model/types';
import { BranchCard } from './BranchCard';

const STEP_COUNT = 2;
const DEFAULT_DISABLED_REASON = 'Cannot be paid for now';

/** "Develop Bone Archer" → "Develop · Bone Archer": the verb, a dot, then the subject. */
function formatHeading(title: string): string {
  const separatorIndex = title.indexOf(' ');
  return separatorIndex < 0
    ? title
    : `${title.slice(0, separatorIndex)} · ${title.slice(separatorIndex + 1)}`;
}

function confirmText(card: BranchChooserCard | undefined): string {
  // No-break spaces keep "· price" with the name when the label wraps.
  // No-break spaces keep "· price" with the name when the label wraps.
  return card ? `Confirm ${card.name} · ${card.price.label}` : 'Choose a branch first';
}

/**
 * Generic two-step modal for picking one of a pair of talent branches:
 * step 1 marks a card, step 2 confirms it. Callers own the data and its
 * formatting; this shell owns the portal, focus trap, keys and layout.
 */
export function BranchChooserDialog({
  title,
  cards,
  lockWarning,
  onConfirm,
  onCancel,
  countdown,
}: BranchChooserDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const warningId = useId();
  const reasonId = useId();
  const modalFocus = useModalFocus(dialogRef, true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const step = selectedCard ? 2 : 1;
  const canConfirm = selectedCard !== undefined && !selectedCard.isDisabled;
  const blockedReason =
    selectedCard?.isDisabled === true
      ? (selectedCard.disabledReason ?? DEFAULT_DISABLED_REASON)
      : null;

  const confirm = (): void => {
    if (selectedCard && !selectedCard.isDisabled) {
      onConfirm(selectedCard.id);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    // Enter on a focused button activates that button; anywhere else it confirms.
    if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      confirm();
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
      <section className={styles.dialog}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title} aria-label={title}>
              {formatHeading(title)}
            </h2>
            <p className={styles.step}>
              <span className={`${styles.dot} ${styles.dotOn}`} aria-hidden="true" />
              <span
                className={`${styles.dot} ${step === STEP_COUNT ? styles.dotOn : ''}`}
                aria-hidden="true"
              />
              <span>
                Step {step} of {STEP_COUNT} · {step === 1 ? 'Choose' : 'Confirm'}
              </span>
            </p>
          </div>
          {countdown && (
            <span className={styles.countdown} role="timer" aria-label={countdown.accessibleLabel}>
              <span className={styles.hourglass} aria-hidden="true" />
              <span aria-hidden="true">{countdown.label}</span>
            </span>
          )}
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            data-sound="ui.close"
            onClick={onCancel}
          />
        </header>
        <div className={styles.cards}>
          {cards.map((card) => (
            <BranchCard
              key={card.id}
              card={card}
              isSelected={card.id === selectedCardId}
              isDimmed={selectedCardId !== null && card.id !== selectedCardId}
              onSelect={() => setSelectedCardId(card.id)}
            />
          ))}
        </div>
        <p className={styles.warning} role="note">
          <span className={styles.warningGlyph} aria-hidden="true" />
          <span id={warningId}>{lockWarning}</span>
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`fantasy-button fantasy-button--steel fantasy-button--compact ${styles.back}`}
            data-sound="ui.close"
            onClick={selectedCard ? () => setSelectedCardId(null) : onCancel}
          >
            <span>{selectedCard ? 'Back' : 'Cancel'}</span>
          </button>
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.confirm}`}
            disabled={!canConfirm}
            aria-label={
              selectedCard
                ? `Confirm ${selectedCard.name} for ${selectedCard.price.accessibleLabel}`
                : 'Confirm branch'
            }
            aria-describedby={blockedReason === null ? undefined : reasonId}
            data-sound="ui.success"
            onClick={confirm}
          >
            <span>{confirmText(selectedCard)}</span>
          </button>
        </div>
        {blockedReason !== null && (
          <p id={reasonId} className={styles.reason} role="status">
            {blockedReason}
          </p>
        )}
      </section>
    </div>,
    document.body,
  );
}
