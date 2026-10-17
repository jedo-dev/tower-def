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

/** Padlock glyph of a locked creature card; decorative, the label carries the meaning. */
function LockGlyph() {
  return (
    <svg className={styles.lockGlyph} viewBox="0 0 12 14" aria-hidden="true" focusable="false">
      <path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="1" y="6" width="10" height="7.5" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * A creature card in send mode: one tap queues a send. Portrait with the
 * "6/6" sends-left badge, name, "$50 +10" price and income, and the talent
 * marks (grade badge, experience bar). Disabled, the reason replaces the
 * price; a tier the unlock schedule still locks keeps its price (the player
 * plans ahead) and wears a padlock and "from wave N" on the portrait.
 * Disabled cards stay focusable (aria-disabled) so the reason is read out and
 * the arrow keys walk the whole row.
 */
export function CreepSendCard({ creature, faction }: CreepSendCardProps) {
  const showsReason = creature.disabledReason !== null && !creature.isLocked;
  const className = [
    'ui-slot',
    styles.card,
    creature.isDisabled ? styles.cardDisabled : '',
    creature.isLocked ? styles.cardLocked : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick(): void {
    if (creature.isDisabled) {
      return;
    }
    sendGameCommand('send-creep', { creepTypeId: creature.creepTypeId });
  }

  return (
    <button
      type="button"
      className={className}
      aria-disabled={creature.isDisabled || undefined}
      aria-label={creature.ariaLabel}
      title={creature.tooltip}
      data-send-card="true"
      data-locked={creature.isLocked || undefined}
      data-sound={creature.isDisabled ? 'ui.error' : undefined}
      onClick={handleClick}
    >
      <span className={styles.portrait}>
        <UnitIcon
          unitId={creature.creepTypeId}
          label={creature.name}
          faction={faction}
          className={styles.portraitIcon}
        />
        {creature.isLocked ? (
          <span className={styles.lockBadge} aria-hidden="true" data-send-lock="true">
            <LockGlyph />
            from wave {creature.unlockWave}
          </span>
        ) : (
          creature.remainingOfType !== null && (
            <span className={styles.remaining} aria-hidden="true" data-send-remaining="true">
              {creature.remainingOfType}/{creature.typeCap}
            </span>
          )
        )}
      </span>
      <span className={styles.name}>{creature.name}</span>
      {showsReason ? (
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
