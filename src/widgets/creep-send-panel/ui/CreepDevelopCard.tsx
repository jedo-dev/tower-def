import { useId, useState } from 'react';
import panelStyles from './CreepSendPanel.module.css';
import styles from './CreepDevelopCard.module.css';
import { sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import type { FactionThemeName } from '../../../shared/constants/theme';
import type { CreepSendButtonViewModel } from '../model/mapCreepSendPanelToViewModel';
import { CreatureBranchChooserDialog } from './CreatureBranchChooserDialog';
import { CreatureTalentMarks } from './CreatureTalentMarks';

export type CreepDevelopCardProps = {
  creature: CreepSendButtonViewModel;
  faction: FactionThemeName;
};

function describeAction(creature: CreepSendButtonViewModel): {
  label: string;
  verb: string;
  cost: number | null;
} {
  const { talent, name } = creature;
  const { action } = talent;
  if (action.kind === 'develop') {
    return {
      label: `Develop ${name}: choose a branch for ${action.cost} XP`,
      verb: 'Develop',
      cost: action.cost,
    };
  }
  if (action.cost === null || action.nextGrade === null) {
    return { label: `Upgrade ${name}: max grade`, verb: 'Maxed', cost: null };
  }
  return {
    label: `Upgrade ${name} to grade ${action.nextGrade} for ${action.cost} XP`,
    verb: `G${action.nextGrade}`,
    cost: action.cost,
  };
}

/**
 * A creature card in develop mode. Without a branch it opens the chooser;
 * with one it buys the next grade. Blocked, it stays focusable
 * (aria-disabled) so the reason is read out and a tap answers with the
 * error sound instead of silence.
 */
export function CreepDevelopCard({ creature, faction }: CreepDevelopCardProps) {
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const reasonId = useId();
  const { talent } = creature;
  const { action } = talent;
  const isBlocked = !action.isAffordable;
  const { label, verb, cost } = describeAction(creature);
  const successSound = action.kind === 'develop' ? 'ui.open' : 'ui.success';

  function handleClick(): void {
    if (isBlocked) {
      return;
    }
    if (action.kind === 'develop') {
      setIsChooserOpen(true);
      return;
    }
    sendGameCommand('upgrade-creature', { unitId: creature.creepTypeId });
  }

  function handleConfirm(branchId: string): void {
    setIsChooserOpen(false);
    sendGameCommand('choose-creature-branch', { unitId: creature.creepTypeId, branchId });
  }

  return (
    <>
      <button
        type="button"
        className={`ui-slot ${panelStyles.button} ${styles.card}${isBlocked ? ` ${styles.cardBlocked}` : ''}`}
        aria-label={label}
        aria-disabled={isBlocked || undefined}
        aria-haspopup={action.kind === 'develop' ? 'dialog' : undefined}
        aria-describedby={isBlocked ? reasonId : undefined}
        title={creature.tooltip}
        data-sound={isBlocked ? 'ui.error' : successSound}
        data-develop-card={action.kind}
        onClick={handleClick}
      >
        <UnitIcon
          unitId={creature.creepTypeId}
          label={creature.name}
          faction={faction}
          className={panelStyles.buttonIcon}
        />
        <span className={panelStyles.buttonName}>{creature.name}</span>
        <span className={styles.action} aria-hidden="true">
          <span className={styles.verb}>{verb}</span>
          {cost !== null && <span className={styles.cost}>{cost} XP</span>}
        </span>
        {isBlocked && (
          <span id={reasonId} className={styles.visuallyHidden}>
            {action.blockedReason}
          </span>
        )}
        <CreatureTalentMarks talent={talent} />
      </button>
      {isChooserOpen && action.kind === 'develop' && (
        <CreatureBranchChooserDialog
          creatureName={creature.name}
          develop={action}
          onConfirm={handleConfirm}
          onCancel={() => setIsChooserOpen(false)}
        />
      )}
    </>
  );
}
