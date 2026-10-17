import { memo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import styles from './CreepSendPanel.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { usePlayerSendLimits } from '../../../shared/lib/game-bridge/useSendLimits';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { mapCreepSendPanelToViewModel } from '../model/mapCreepSendPanelToViewModel';
import { CreepDevelopCard } from './CreepDevelopCard';
import { CreepSendCard } from './CreepSendCard';
import { SendCardRow } from './SendCardRow';

export const CREEP_SEND_PANEL_LABEL = 'Creep sending panel';

export type CreepSendPanelProps = {
  setup: GameSetupConfig | null;
  /**
   * Develop mode, owned by the dock: its toggle sits in the dock's tab rail
   * (CreepDevelopToggle), the cards here follow it.
   */
  isDevelopMode: boolean;
  onDevelopModeChange: (isDevelopMode: boolean) => void;
  /**
   * The card row's scroll offset, owned by the dock: restored when the tab
   * mounts again, reported on scroll. Defaults to the row's start.
   */
  initialScrollLeft?: number;
  onScrollLeftChange?: (scrollLeft: number) => void;
};

function ignoreScrollLeft(): void {}

/**
 * The SEND tab of the dock: a one-line note (the queue, or each tier's
 * experience while developing) over one sideways-scrolling row of every
 * creature of the race, locked tiers included. Send mode:
 * a tap queues a send. Develop mode: a tap opens the branch chooser or buys
 * the next grade, so a send tap can never spend experience.
 */
function CreepSendPanelComponent({
  setup,
  isDevelopMode,
  onDevelopModeChange,
  initialScrollLeft = 0,
  onScrollLeftChange = ignoreScrollLeft,
}: CreepSendPanelProps) {
  const snapshot = useGameHudSnapshot();
  const sendLimits = usePlayerSendLimits();
  const viewModel = mapCreepSendPanelToViewModel(snapshot, setup, sendLimits);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape' && isDevelopMode) {
      event.preventDefault();
      onDevelopModeChange(false);
    }
  }

  return (
    <section
      className={styles.panel}
      data-creep-send-panel="true"
      data-mode={isDevelopMode ? 'develop' : 'send'}
      aria-label={CREEP_SEND_PANEL_LABEL}
      onKeyDown={handleKeyDown}
    >
      {isDevelopMode ? (
        <ul className={styles.note} aria-label="Creature experience by tier">
          {viewModel.xpByTier.map((tierXp) => (
            <li
              key={tierXp.tier}
              className={styles.tierXp}
              aria-label={tierXp.ariaLabel}
              data-tier-xp={tierXp.tier}
            >
              {tierXp.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.note} aria-live="polite" data-send-queue="">
          {viewModel.isBattleActive ? (
            <span className={styles.phaseNote}>Locked in battle</span>
          ) : (
            <span>{viewModel.queueSummary}</span>
          )}
          {viewModel.waveCapacityAriaLabel && (
            <span className={styles.visuallyHidden} data-send-capacity="true">
              {viewModel.waveCapacityAriaLabel}
            </span>
          )}
        </p>
      )}

      <SendCardRow initialScrollLeft={initialScrollLeft} onScrollLeftChange={onScrollLeftChange}>
        {viewModel.buttons.map((creature) =>
          isDevelopMode ? (
            <CreepDevelopCard
              key={creature.creepTypeId}
              creature={creature}
              faction={viewModel.faction}
            />
          ) : (
            <CreepSendCard
              key={creature.creepTypeId}
              creature={creature}
              faction={viewModel.faction}
            />
          ),
        )}
      </SendCardRow>
    </section>
  );
}

export const CreepSendPanel = memo(CreepSendPanelComponent);
