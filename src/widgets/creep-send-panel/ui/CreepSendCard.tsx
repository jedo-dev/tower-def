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

/**
 * A creature card in send mode: one tap queues a send. Portrait with the
 * "6/6" sends-left badge, name, "$50 +10" price and income, and the talent
 * marks (grade badge, experience bar). Disabled, the reason replaces the price.
 */
export function CreepSendCard({ creature, faction }: CreepSendCardProps) {
  return (
    <button
      type="button"
      className={`ui-slot ${styles.card}`}
      disabled={creature.isDisabled}
      aria-label={creature.ariaLabel}
      title={creature.tooltip}
      data-send-card="true"
      onClick={() => sendGameCommand('send-creep', { creepTypeId: creature.creepTypeId })}
    >
      <span className={styles.portrait}>
        <UnitIcon
          unitId={creature.creepTypeId}
          label={creature.name}
          faction={faction}
          className={styles.portraitIcon}
        />
        {creature.remainingOfType !== null && (
          <span className={styles.remaining} aria-hidden="true" data-send-remaining="true">
            {creature.remainingOfType}/{creature.typeCap}
          </span>
        )}
      </span>
      <span className={styles.name}>{creature.name}</span>
      {creature.disabledReason ? (
        <span className={styles.reason} aria-hidden="true">
          {creature.disabledReason}
        </span>
      ) : (
        <span className={styles.stats} aria-hidden="true">
          <span className={`ui-icon-coin ${styles.coin}`} />
          <span className={styles.cost}>${creature.cost}</span>
          <span className={styles.income}>+{creature.incomeGain}</span>
        </span>
      )}
      <CreatureTalentMarks talent={creature.talent} />
    </button>
  );
}
