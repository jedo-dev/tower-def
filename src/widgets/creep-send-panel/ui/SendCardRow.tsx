import { useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import styles from './CreepSendPanel.module.css';
import { useScrollRowEdges } from './useScrollRowEdges';
import { resolveCardIndexForKey } from '../model/resolveCardIndexForKey';

export type SendCardRowProps = {
  children: ReactNode;
  /** Scroll offset to restore on mount (the dock keeps it across tab switches). */
  initialScrollLeft: number;
  onScrollLeftChange: (scrollLeft: number) => void;
};

function listCards(row: HTMLElement): HTMLElement[] {
  return Array.from(row.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'BUTTON',
  );
}

/**
 * The SEND tab's one row of creature cards: it scrolls sideways (snap per
 * card, momentum, no scrollbar) and fades the edge that hides more cards.
 * Arrow keys, Home and End move focus along the cards and bring the focused
 * one into view, so the whole row is keyboard-reachable. The scroll offset
 * is reported on scroll events and restored on mount.
 */
export function SendCardRow({ children, initialScrollLeft, onScrollLeftChange }: SendCardRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { edges, measure } = useScrollRowEdges(rowRef, initialScrollLeft);

  function handleScroll(): void {
    const row = rowRef.current;
    if (!row) {
      return;
    }
    onScrollLeftChange(row.scrollLeft);
    measure();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const row = rowRef.current;
    if (!row) {
      return;
    }
    const cards = listCards(row);
    // Only a card's own keys: a branch chooser opened from a card is portalled
    // elsewhere in the DOM, but its key events still bubble through React here.
    const currentIndex = cards.findIndex((card) => card === event.target);
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = resolveCardIndexForKey(currentIndex, cards.length, event.key);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const next = cards[nextIndex];
    next.focus({ preventScroll: true });
    next.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  return (
    <div
      ref={rowRef}
      className={styles.cards}
      role="group"
      aria-label="Creature cards"
      data-send-row="true"
      data-fade-start={edges.hasMoreAtStart || undefined}
      data-fade-end={edges.hasMoreAtEnd || undefined}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
