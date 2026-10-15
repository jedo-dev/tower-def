import { memo, useEffect, useRef, useState } from 'react';
import styles from './EngineErrorOverlay.module.css';
import { onGameEvent, sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import type { GameEventMap } from '../../../shared/lib/game-bridge/types';
import { useModalFocus } from '../../../shared/lib/modal-focus';
import { ErrorFallback } from '../../../shared/ui/error-boundary';

export type EngineErrorOverlayProps = {
  onExit: () => void;
};

export const ENGINE_ERROR_TITLE = 'The battlefield stopped';

type EngineError = GameEventMap['engine-error'];

/**
 * Recover state for a crashed scene. The engine reports the error on the
 * bridge and pauses itself; this covers the page until the player restarts
 * the run (the engine resets and announces `match-started`) or leaves.
 */
function EngineErrorOverlayComponent({ onExit }: EngineErrorOverlayProps) {
  const [engineError, setEngineError] = useState<EngineError | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const modalFocus = useModalFocus(dialogRef, engineError !== null);

  useEffect(() => {
    const unsubscribeError = onGameEvent('engine-error', (payload) => setEngineError(payload));
    const unsubscribeStart = onGameEvent('match-started', () => setEngineError(null));
    return () => {
      unsubscribeError();
      unsubscribeStart();
    };
  }, []);

  if (engineError === null) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={ENGINE_ERROR_TITLE}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
    >
      <div className={styles.panel}>
        <ErrorFallback
          title={ENGINE_ERROR_TITLE}
          message={`${engineError.message} (${engineError.phase})`}
          actions={[
            { label: 'Restart run', onClick: () => sendGameCommand('restart-match', undefined) },
            { label: 'Back to menu', onClick: onExit, isPrimary: false },
          ]}
        />
      </div>
    </div>
  );
}

export const EngineErrorOverlay = memo(EngineErrorOverlayComponent);
