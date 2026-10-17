import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

/** Which edges of a horizontal scroll row hide more content. */
export type ScrollRowEdges = {
  hasMoreAtStart: boolean;
  hasMoreAtEnd: boolean;
};

const NO_HIDDEN_EDGES: ScrollRowEdges = { hasMoreAtStart: false, hasMoreAtEnd: false };

/** Sub-pixel scroll positions on zoomed or high-density screens. */
const EDGE_TOLERANCE_PX = 1;

/** Pure: the hidden edges of a row from its scroll metrics. */
export function measureScrollRowEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): ScrollRowEdges {
  return {
    hasMoreAtStart: scrollLeft > EDGE_TOLERANCE_PX,
    hasMoreAtEnd: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE_PX,
  };
}

function isSameEdges(left: ScrollRowEdges, right: ScrollRowEdges): boolean {
  return left.hasMoreAtStart === right.hasMoreAtStart && left.hasMoreAtEnd === right.hasMoreAtEnd;
}

/**
 * The hidden edges of a scroll row, for its edge fades. Re-measured on the
 * row's scroll events and resizes only (never per frame), and the state
 * changes only when an edge flips, so scrolling re-renders the row at most
 * at the two ends. On mount it restores `initialScrollLeft`.
 */
export function useScrollRowEdges(
  rowRef: RefObject<HTMLElement | null>,
  initialScrollLeft: number,
): { edges: ScrollRowEdges; measure: () => void } {
  const [edges, setEdges] = useState<ScrollRowEdges>(NO_HIDDEN_EDGES);
  // The restore is for the mount only; later scrolls belong to the player.
  const [mountScrollLeft] = useState(initialScrollLeft);

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }
    const next = measureScrollRowEdges(row.scrollLeft, row.clientWidth, row.scrollWidth);
    setEdges((current) => (isSameEdges(current, next) ? current : next));
  }, [rowRef]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return undefined;
    }
    row.scrollLeft = mountScrollLeft;
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    return () => observer.disconnect();
  }, [rowRef, measure, mountScrollLeft]);

  return { edges, measure };
}
