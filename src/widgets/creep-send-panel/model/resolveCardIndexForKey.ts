/** Index of the card a SEND row key moves focus to, or null for any other key. */
export function resolveCardIndexForKey(
  currentIndex: number,
  cardCount: number,
  key: string,
): number | null {
  if (cardCount === 0) {
    return null;
  }
  switch (key) {
    case 'ArrowRight':
      return Math.min(cardCount - 1, currentIndex + 1);
    case 'ArrowLeft':
      return Math.max(0, currentIndex - 1);
    case 'Home':
      return 0;
    case 'End':
      return cardCount - 1;
    default:
      return null;
  }
}
