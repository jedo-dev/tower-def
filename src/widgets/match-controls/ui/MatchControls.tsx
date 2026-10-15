import { memo, useCallback, useState } from 'react';
import styles from './MatchControls.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { GameSpeed } from '../../../shared/lib/game-bridge/types';
import type { MatchShortcutAction } from '../model/matchKeyboardShortcuts';
import { useMatchKeyboardShortcuts } from '../model/useMatchKeyboardShortcuts';
import { QuitMatchDialog } from './QuitMatchDialog';

const SPEED_OPTIONS: readonly GameSpeed[] = [1, 2];

function joinClassNames(...classNames: (string | false)[]): string {
  return classNames.filter(Boolean).join(' ');
}

/**
 * Pause / speed / quit for the running match. The engine owns the pause and
 * speed state (it arrives in the HUD snapshot); only the quit confirmation is
 * UI state here.
 */
function MatchControlsComponent() {
  const snapshot = useGameHudSnapshot();
  const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);
  const isMatchActive = snapshot.matchOutcome.status === 'active';
  const { isPaused, gameSpeed } = snapshot;

  const togglePause = useCallback(() => {
    sendGameCommand('set-paused', { isPaused: !isPaused });
  }, [isPaused]);

  const openQuitDialog = useCallback(() => setIsQuitDialogOpen(true), []);
  const closeQuitDialog = useCallback(() => setIsQuitDialogOpen(false), []);
  const confirmQuit = useCallback(() => {
    setIsQuitDialogOpen(false);
    sendGameCommand('quit-match', undefined);
  }, []);

  const onShortcut = useCallback(
    (action: MatchShortcutAction) => {
      switch (action.kind) {
        case 'toggle-pause':
          togglePause();
          return;
        case 'set-speed':
          sendGameCommand('set-game-speed', { speed: action.speed });
          return;
        case 'zoom-board':
          sendGameCommand('zoom-board', { action: action.action });
          return;
        case 'request-quit':
          openQuitDialog();
          return;
      }
    },
    [togglePause, openQuitDialog],
  );

  // The outcome overlay and the quit dialog are modal; keys stay with them.
  useMatchKeyboardShortcuts({
    onAction: onShortcut,
    isEnabled: isMatchActive && !isQuitDialogOpen,
  });

  return (
    <>
      <div className={styles.strip} role="group" aria-label="Match controls">
        <button
          type="button"
          className={joinClassNames(styles.button, isPaused && styles.buttonActive)}
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
          aria-pressed={isPaused}
          aria-keyshortcuts="Space P"
          title={isPaused ? 'Resume (Space / P)' : 'Pause (Space / P)'}
          onClick={togglePause}
        >
          <span aria-hidden="true">{isPaused ? '▶' : '‖'}</span>
        </button>
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={joinClassNames(styles.button, gameSpeed === speed && styles.buttonActive)}
            aria-label={`Game speed ${speed}x`}
            aria-pressed={gameSpeed === speed}
            aria-keyshortcuts={String(speed)}
            title={`Speed ${speed}x (${speed})`}
            onClick={() => sendGameCommand('set-game-speed', { speed })}
          >
            {speed}x
          </button>
        ))}
        <button
          type="button"
          className={joinClassNames(styles.button, styles.buttonQuit)}
          aria-label="Quit to menu"
          aria-keyshortcuts="Escape"
          title="Quit to menu (Esc)"
          onClick={openQuitDialog}
        >
          <span aria-hidden="true">{'✕'}</span>
        </button>
      </div>
      {isQuitDialogOpen && <QuitMatchDialog onConfirm={confirmQuit} onCancel={closeQuitDialog} />}
    </>
  );
}

export const MatchControls = memo(MatchControlsComponent);
