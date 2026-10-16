import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './BranchChooserDialog.module.css';
import { useModalFocus } from '../../../lib/modal-focus';
import { BranchGlyph } from '../../branch-glyph';
import type { BranchChooserCard, BranchChooserDialogProps } from '../model/types';
import { BranchGradeTable } from './BranchGradeTable';

type BranchCardProps = {
  card: BranchChooserCard;
  isSelected: boolean;
  onSelect: () => void;
};

function BranchCard({ card, isSelected, onSelect }: BranchCardProps) {
  const titleId = useId();

  return (
    <article
      className={isSelected ? `${styles.card} ${styles.cardSelected}` : styles.card}
      aria-labelledby={titleId}
    >
      <header className={styles.cardHeader}>
        <BranchGlyph glyph={card.glyph} />
        <h3 id={titleId} className={styles.cardTitle}>
          {card.name}
        </h3>
      </header>
      <p className={styles.cardDescription}>{card.description}</p>
      <BranchGradeTable table={card.grades} />
      <button
        type="button"
        className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.chooseBtn}`}
        aria-pressed={isSelected}
        aria-label={`Choose ${card.name} for ${card.price.accessibleLabel}`}
        disabled={card.isDisabled}
        title={card.isDisabled ? card.disabledReason : undefined}
        onClick={onSelect}
      >
        <span>{isSelected ? 'Selected' : 'Choose'}</span>
        <span className={styles.cost}>{card.price.label}</span>
      </button>
    </article>
  );
}

/**
 * Generic modal for picking one of a pair of talent branches. Choosing a card
 * only marks it; Confirm commits the marked branch. Callers own the data and
 * its formatting; this shell owns the portal, focus trap, Esc and layout.
 */
export function BranchChooserDialog({
  title,
  cards,
  lockWarning,
  onConfirm,
  onCancel,
}: BranchChooserDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const warningId = useId();
  const modalFocus = useModalFocus(dialogRef, true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    modalFocus.onKeyDown(event);
  };

  // The confirm button shows the price before a card is marked, so it falls
  // back to the first card's price (both cards of a pair cost the same).
  const confirmPrice = (selectedCard ?? cards[0])?.price;

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
          {title}
        </h2>
        <div className={styles.cards}>
          {cards.map((card) => (
            <BranchCard
              key={card.id}
              card={card}
              isSelected={card.id === selectedCardId}
              onSelect={() => setSelectedCardId(card.id)}
            />
          ))}
        </div>
        <p id={warningId} className={styles.warning}>
          {lockWarning}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`fantasy-button fantasy-button--emerald fantasy-button--compact ${styles.actionBtn}`}
            disabled={selectedCard === undefined || selectedCard.isDisabled}
            aria-label={
              selectedCard
                ? `Confirm ${selectedCard.name} for ${selectedCard.price.accessibleLabel}`
                : 'Confirm branch'
            }
            data-sound="ui.success"
            onClick={() => {
              if (selectedCard && !selectedCard.isDisabled) {
                onConfirm(selectedCard.id);
              }
            }}
          >
            <span>Confirm</span>
            {confirmPrice ? <span className={styles.cost}>{confirmPrice.label}</span> : null}
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
