import { memo } from 'react';
import styles from './CreepSendPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { mapCreepSendPanelToViewModel } from '../model/mapCreepSendPanelToViewModel';
import type { UnitId } from '../../../entities/unit';

export type CreepSendPanelProps = {
  setup: GameSetupConfig | null;
};

function CreepSendPanelComponent({ setup }: CreepSendPanelProps) {
  const snapshot = useGameHudSnapshot();
  const viewModel = mapCreepSendPanelToViewModel(snapshot, setup);

  function handleSend(creepTypeId: UnitId): void {
    sendGameCommand('send-creep', { creepTypeId });
  }

  return (
    <section className={styles.panel} data-creep-send-panel="true" aria-label="Creep sending panel">
      <div className={styles.header}>
        <span className={styles.title}>Send {viewModel.raceName}</span>
        <span className={styles.queue} aria-live="polite">
          {viewModel.isBattleActive ? (
            <span className={styles.phaseNote}>Locked in battle</span>
          ) : (
            <span>{viewModel.queueSummary}</span>
          )}
        </span>
        <span className={styles.meta} aria-label={`Gold ${viewModel.gold}, income ${viewModel.income}`}>
          <span>${viewModel.gold}</span>
          <span>INC {viewModel.income}</span>
        </span>
      </div>

      <div className={styles.buttons}>
        {viewModel.buttons.map((button) => (
          <button
            key={button.creepTypeId}
            type="button"
            className={styles.button}
            disabled={button.isDisabled}
            aria-label={button.ariaLabel}
            onClick={() => handleSend(button.creepTypeId)}
          >
            <span className={styles.buttonName}>{button.name}</span>
            <span className={styles.buttonStats} aria-hidden="true">
              <span>T{button.tier}</span>
              <span>${button.cost}</span>
              <span>+{button.incomeGain}</span>
            </span>
            {button.disabledReason && (
              <span className={styles.buttonReason} aria-hidden="true">
                {button.disabledReason}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export const CreepSendPanel = memo(CreepSendPanelComponent);
