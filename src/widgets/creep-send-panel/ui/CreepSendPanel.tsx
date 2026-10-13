import { memo } from 'react';
import styles from './CreepSendPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { useGameHudSnapshot } from '../../../shared/lib/game-bridge/useGameHudSnapshot';
import { usePlayerSendLimits } from '../../../shared/lib/game-bridge/useSendLimits';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { mapCreepSendPanelToViewModel } from '../model/mapCreepSendPanelToViewModel';
import type { UnitId } from '../../../entities/unit';
import { UnitIcon } from '../../../shared/ui/unit-icon';

export type CreepSendPanelProps = {
  setup: GameSetupConfig | null;
};

function CreepSendPanelComponent({ setup }: CreepSendPanelProps) {
  const snapshot = useGameHudSnapshot();
  const sendLimits = usePlayerSendLimits();
  const viewModel = mapCreepSendPanelToViewModel(snapshot, setup, sendLimits);

  function handleSend(creepTypeId: UnitId): void {
    sendGameCommand('send-creep', { creepTypeId });
  }

  return (
    <section
      className={`ui-panel ${styles.panel}`}
      data-creep-send-panel="true"
      aria-label="Creep sending panel"
    >
      <div className={styles.header}>
        <span className={`ui-heading ${styles.title}`}>Send {viewModel.raceName}</span>
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

      <div className={styles.buttons}>
        {viewModel.buttons.map((button) => (
          <button
            key={button.creepTypeId}
            type="button"
            className={`ui-slot ${styles.button}`}
            disabled={button.isDisabled}
            aria-label={button.ariaLabel}
            onClick={() => handleSend(button.creepTypeId)}
          >
            <UnitIcon
              unitId={button.creepTypeId}
              label={button.name}
              faction={viewModel.faction}
              className={styles.buttonIcon}
            />
            <span className={styles.buttonName}>{button.name}</span>
            <span className={styles.buttonStats} aria-hidden="true">
              <span>T{button.tier}</span>
              <span className={styles.buttonCost}>${button.cost}</span>
              <span className={styles.buttonIncome}>+{button.incomeGain}</span>
              {button.remainingOfType !== null && (
                <span className={styles.buttonRemaining} data-send-remaining="true">
                  {button.remainingOfType}/{button.typeCap}
                </span>
              )}
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
