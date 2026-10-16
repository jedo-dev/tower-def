import styles from './CreepSendPanel.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import type { FactionThemeName } from '../../../shared/constants/theme';
import type { CreepSendButtonViewModel } from '../model/mapCreepSendPanelToViewModel';
import { CreatureTalentMarks } from './CreatureTalentMarks';

export type CreepSendCardProps = {
  creature: CreepSendButtonViewModel;
  faction: FactionThemeName;
};

/** A creature card in send mode: one tap queues a send. */
export function CreepSendCard({ creature, faction }: CreepSendCardProps) {
  return (
    <button
      type="button"
      className={`ui-slot ${styles.button}`}
      disabled={creature.isDisabled}
      aria-label={creature.ariaLabel}
      title={creature.tooltip}
      data-send-card="true"
      onClick={() => sendGameCommand('send-creep', { creepTypeId: creature.creepTypeId })}
    >
      <UnitIcon
        unitId={creature.creepTypeId}
        label={creature.name}
        faction={faction}
        className={styles.buttonIcon}
      />
      <span className={styles.buttonName}>{creature.name}</span>
      <span className={styles.buttonStats} aria-hidden="true">
        <span>T{creature.tier}</span>
        <span className={styles.buttonCost}>${creature.cost}</span>
        <span className={styles.buttonIncome}>+{creature.incomeGain}</span>
        {creature.remainingOfType !== null && (
          <span className={styles.buttonRemaining} data-send-remaining="true">
            {creature.remainingOfType}/{creature.typeCap}
          </span>
        )}
      </span>
      {creature.disabledReason && (
        <span className={styles.buttonReason} aria-hidden="true">
          {creature.disabledReason}
        </span>
      )}
      <CreatureTalentMarks talent={creature.talent} />
    </button>
  );
}
