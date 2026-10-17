import { useLayoutEffect, useRef, type RefObject } from 'react';

export type StripHeightLockOptions = {
  /** Lock the strip at the height it last had while unlocked. */
  isLocked: boolean;
  /** Record the height while true (the dock is showing, in portrait). */
  isMeasuring: boolean;
};

/**
 * Keeps the portrait control strip at the height the dock gave it while the
 * tower sheet stands in for the dock, so the battlefield above (the leftover
 * flex space) keeps its exact height and the grid never jumps.
 *
 * The height is recorded while the dock shows: when it comes back and on
 * every resize of the strip (the send panel and the HUD change size without
 * re-rendering the page). Locking happens in a
 * layout effect, before the browser paints the swapped content.
 */
export function useStripHeightLock(
  stripRef: RefObject<HTMLElement | null>,
  { isLocked, isMeasuring }: StripHeightLockOptions,
): void {
  const measuredHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || !isMeasuring) {
      return;
    }
    const record = (): void => {
      measuredHeightRef.current = strip.getBoundingClientRect().height;
    };
    record();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(record);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [stripRef, isMeasuring]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    const height = measuredHeightRef.current;
    if (!strip || !isLocked || height === null || height <= 0) {
      return;
    }
    strip.style.height = `${height}px`;
    return () => {
      strip.style.removeProperty('height');
    };
  }, [stripRef, isLocked]);
}
