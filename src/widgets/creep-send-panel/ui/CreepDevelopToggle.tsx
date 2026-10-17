import { memo } from 'react';
import styles from './CreepSendPanel.module.css';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { mapCreepSendPanelToViewModel } from '../model/mapCreepSendPanelToViewModel';

export type CreepDevelopToggleProps = {
  setup: GameSetupConfig | null;
  isDevelopMode: boolean;
  onDevelopModeChange: (isDevelopMode: boolean) => void;
};

/**
 * The DEVELOP switch of the SEND tab, drawn in the dock's tab rail. A gold
 * dot says some creature can choose a branch or buy a grade right now.
 */
function CreepDevelopToggleComponent({
  setup,
  isDevelopMode,
  onDevelopModeChange,
}: CreepDevelopToggleProps) {
  const snapshot = useGameHudSnapshot();
  const { hasAffordableTalent } = mapCreepSendPanelToViewModel(snapshot, setup);

  return (
    <button
      type="button"
      className={`${styles.developToggle}${isDevelopMode ? ` ${styles.developToggleOn}` : ''}`}
      aria-pressed={isDevelopMode}
      aria-label={
        hasAffordableTalent ? 'Develop creatures, upgrades available' : 'Develop creatures'
      }
      data-sound={isDevelopMode ? 'ui.close' : 'ui.open'}
      onClick={() => onDevelopModeChange(!isDevelopMode)}
    >
      <span>{isDevelopMode ? 'Done' : 'Develop'}</span>
      {hasAffordableTalent && !isDevelopMode && (
        <span className={styles.developDot} aria-hidden="true" />
      )}
    </button>
  );
}

export const CreepDevelopToggle = memo(CreepDevelopToggleComponent);
