import { memo, useRef } from 'react';
import styles from './MatchOutcomeOverlay.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { useModalFocus } from '../../../shared/lib/modal-focus';
import { FantasyButton } from '../../../shared/ui/fantasy-button';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';
import { mapMatchOutcomeToViewModel } from '../model/mapMatchOutcomeToViewModel';

export type MatchOutcomeOverlayProps = {
  onExit: () => void;
};

/** Side of the winner's race emblem above the title, in px. */
const WINNER_EMBLEM_SIZE = 72;

const TONE_CLASS = {
  victory: styles.titleVictory,
  defeat: styles.titleDefeat,
  draw: styles.titleDraw,
} as const;

function MatchOutcomeOverlayComponent({ onExit }: MatchOutcomeOverlayProps) {
  const snapshot = useGameHudSnapshot();
  const viewModel = mapMatchOutcomeToViewModel(snapshot);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Modal contract: take focus, trap Tab, make the covered page inert.
  const modalFocus = useModalFocus(dialogRef, viewModel.isVisible);

  if (!viewModel.isVisible) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={viewModel.ariaLabel}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
    >
      <div className={styles.panel}>
        {viewModel.winnerRace !== null && (
          <FactionEmblem
            race={viewModel.winnerRace}
            size={WINNER_EMBLEM_SIZE}
            className={styles.winnerEmblem}
          />
        )}
        <p className={`${styles.title} ${TONE_CLASS[viewModel.tone]}`}>{viewModel.title}</p>
        <p className={styles.detail}>{viewModel.detail}</p>

        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Your HP</span>
            <span className={styles.statValue}>{snapshot.lives}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Enemy HP</span>
            <span className={styles.statValue}>{snapshot.opponentLives}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Income</span>
            <span className={styles.statValue}>{snapshot.income}</span>
          </span>
        </div>

        <div className={styles.actions}>
          <FantasyButton
            tone="ember"
            onClick={() => sendGameCommand('restart-match', undefined)}
            data-sound="ui.success"
          >
            Rematch
          </FantasyButton>
          <FantasyButton tone="ghost" onClick={onExit} data-sound="ui.close">
            Back to menu
          </FantasyButton>
        </div>
      </div>
    </div>
  );
}

export const MatchOutcomeOverlay = memo(MatchOutcomeOverlayComponent);
