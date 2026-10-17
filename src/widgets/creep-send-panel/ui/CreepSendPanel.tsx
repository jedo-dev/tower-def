import { memo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import styles from './CreepSendPanel.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { usePlayerSendLimits } from '../../../shared/lib/game-bridge/useSendLimits';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { mapCreepSendPanelToViewModel } from '../model/mapCreepSendPanelToViewModel';
import { CreepDevelopCard } from './CreepDevelopCard';
import { CreepSendCard } from './CreepSendCard';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';

/** Side of the race emblem in the panel heading, in px; fits the heading line. */
const TITLE_EMBLEM_SIZE = 20;

export type CreepSendPanelProps = {
  setup: GameSetupConfig | null;
  /** Folded to its header while the build drawer owns the strip (portrait accordion). */
  isCompact?: boolean;
};

/**
 * The creature cards work in one of two modes. Send (default): a tap queues
 * a send. Develop: a tap opens the branch chooser or buys the next grade.
 * One header toggle switches them, so a send tap can never spend experience
 * and the cards keep their full size as touch targets.
 */
function CreepSendPanelComponent({ setup, isCompact = false }: CreepSendPanelProps) {
  const snapshot = useGameHudSnapshot();
  const sendLimits = usePlayerSendLimits();
  const viewModel = mapCreepSendPanelToViewModel(snapshot, setup, sendLimits);
  const [isDevelopMode, setIsDevelopMode] = useState(false);
  const isDeveloping = isDevelopMode && !isCompact;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape' && isDeveloping) {
      event.preventDefault();
      setIsDevelopMode(false);
    }
  }

  return (
    <section
      className={`ui-panel ${styles.panel}${isCompact ? ` ${styles.panelCompact}` : ''}`}
      data-creep-send-panel="true"
      data-compact={isCompact || undefined}
      data-mode={isDeveloping ? 'develop' : 'send'}
      aria-label="Creep sending panel"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <span className={`ui-heading ${styles.title}`}>
          <FactionEmblem race={viewModel.raceId} size={TITLE_EMBLEM_SIZE} decorative />
          <span className={styles.titleText}>
            {isDeveloping ? 'Develop' : 'Send'} {viewModel.raceName}
          </span>
        </span>
        {!isCompact && (
          <button
            type="button"
            className={`${styles.modeToggle}${isDeveloping ? ` ${styles.modeToggleOn}` : ''}`}
            aria-pressed={isDeveloping}
            aria-label={
              viewModel.hasAffordableTalent
                ? 'Develop creatures, upgrades available'
                : 'Develop creatures'
            }
            data-sound={isDeveloping ? 'ui.close' : 'ui.open'}
            onClick={() => setIsDevelopMode((current) => !current)}
          >
            <span>{isDeveloping ? 'Done' : 'Develop'}</span>
            {viewModel.hasAffordableTalent && !isDeveloping && (
              <span className={styles.modeToggleDot} aria-hidden="true" />
            )}
          </button>
        )}
        {!isCompact && !isDeveloping && (
          <span className={styles.queue} aria-live="polite">
            {viewModel.isBattleActive ? (
              <span className={`ui-chip ${styles.phaseNote}`}>Locked in battle</span>
            ) : (
              <span className="ui-chip">{viewModel.queueSummary}</span>
            )}
            {viewModel.waveCapacitySummary && (
              <span
                className={`ui-chip ${styles.capacity}`}
                aria-label={viewModel.waveCapacityAriaLabel ?? undefined}
                data-send-capacity="true"
              >
                {viewModel.waveCapacitySummary}
              </span>
            )}
          </span>
        )}
        {isDeveloping && (
          <ul className={styles.queue} aria-label="Creature experience by tier">
            {viewModel.xpByTier.map((tierXp) => (
              <li
                key={tierXp.tier}
                className={`ui-chip ${styles.capacity} ${styles.tierXp}`}
                aria-label={tierXp.ariaLabel}
                data-tier-xp={tierXp.tier}
              >
                {tierXp.label}
              </li>
            ))}
          </ul>
        )}
        <span
          className={styles.meta}
          aria-label={`Gold ${viewModel.gold}, income ${viewModel.income}`}
        >
          <span className={styles.metaGold}>$ {viewModel.gold}</span>
          <span className={styles.metaIncome}>
            <span className={styles.metaLabel}>INC</span> {viewModel.income}
          </span>
        </span>
      </div>

      {!isCompact && (
        <div className={styles.buttons}>
          {viewModel.buttons.map((creature) =>
            isDeveloping ? (
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
        </div>
      )}
    </section>
  );
}

export const CreepSendPanel = memo(CreepSendPanelComponent);
