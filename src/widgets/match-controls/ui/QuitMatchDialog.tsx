import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import styles from './MatchControls.module.css';
import { useModalFocus } from '../../../shared/lib/modal-focus';
import { FantasyButton } from '../../../shared/ui/fantasy-button';

export type QuitMatchDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export const QUIT_DIALOG_TITLE = 'Leave the match?';

/** Confirmation before quitting to the menu; the run is lost on confirm. */
export function QuitMatchDialog({ onConfirm, onCancel }: QuitMatchDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const modalFocus = useModalFocus(dialogRef, true);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    modalFocus.onKeyDown(event);
  };

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quit-match-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className={styles.dialog}>
        <p id="quit-match-title" className={styles.dialogTitle}>
          {QUIT_DIALOG_TITLE}
        </p>
        <p className={styles.dialogDetail}>Your current run will be lost.</p>
        <div className={styles.dialogActions}>
          <FantasyButton tone="danger" onClick={onConfirm} data-sound="ui.close">
            Leave match
          </FantasyButton>
          <FantasyButton tone="ghost" onClick={onCancel}>
            Keep playing
          </FantasyButton>
        </div>
      </div>
    </div>
  );
}
