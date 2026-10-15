import { useEffect } from 'react';
import { getGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';

/**
 * Asks the browser for a "leave page?" prompt while a match is in progress,
 * so a stray reload or back swipe does not throw the run away. Reads the
 * bridge directly (no React state): the snapshot is event-driven and the
 * prompt text is the browser's own.
 */
export function useMatchUnloadGuard(): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (getGameHudSnapshot().matchOutcome.status !== 'active') {
        return;
      }
      event.preventDefault();
      // Legacy browsers only show the prompt with a returnValue set.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}
