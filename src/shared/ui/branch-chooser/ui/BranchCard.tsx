import { useId } from 'react';
import styles from './BranchCard.module.css';
import { BranchGlyph } from '../../branch-glyph';
import type { BranchChooserCard } from '../model/types';
import { BranchGradeTable } from './BranchGradeTable';

type BranchCardProps = {
  card: BranchChooserCard;
  isSelected: boolean;
  /** Another card is marked, so this one recedes. */
  isDimmed: boolean;
  onSelect: () => void;
};

/**
 * One branch of the pair. The whole card is the tap target: a transparent
 * button stretched over it marks the branch, the table stays readable below.
 */
export function BranchCard({ card, isSelected, isDimmed, onSelect }: BranchCardProps) {
  const titleId = useId();
  const classNames = [
    styles.card,
    isSelected ? styles.cardSelected : undefined,
    isDimmed ? styles.cardDimmed : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classNames} aria-labelledby={titleId}>
      <button
        type="button"
        className={styles.pick}
        aria-pressed={isSelected}
        aria-label={`Choose ${card.name} for ${card.price.accessibleLabel}`}
        data-sound="ui.select"
        onClick={onSelect}
      />
      {isSelected && (
        <span className={styles.chosen} aria-hidden="true">
          Chosen
        </span>
      )}
      <BranchGlyph glyph={card.glyph} branchId={card.id} size="large" className={styles.icon} />
      <h3 id={titleId} className={styles.name}>
        {card.name}
      </h3>
      <p className={styles.description}>{card.description}</p>
      <BranchGradeTable table={card.grades} />
      <span className={styles.price}>{card.price.label}</span>
    </article>
  );
}
