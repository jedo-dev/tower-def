import type { FactionThemeName } from '../../../shared/constants/theme';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import { ARMOR_SHORT_LABELS } from '../model/combatTypeDisplay';
import type { CreepCardViewModel } from '../model/types';
import { CreepBranchTable } from './CreepBranchTable';
import { StatGrid, type StatCell } from './StatGrid';
import styles from './BestiaryPage.module.css';

export type CreepCardProps = {
  creep: CreepCardViewModel;
  faction: FactionThemeName;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function creepStats(creep: CreepCardViewModel): StatCell[] {
  return [
    { key: 'health', label: 'HP (wave 1)', value: String(creep.health) },
    { key: 'speed', label: 'Speed', value: String(creep.speed) },
    {
      key: 'physical-armor',
      label: ARMOR_SHORT_LABELS.physical,
      value: String(creep.physicalArmor),
      hint: creep.physicalArmorHint,
    },
    {
      key: 'magical-armor',
      label: ARMOR_SHORT_LABELS.magical,
      value: String(creep.magicalArmor),
      hint: creep.magicalArmorHint,
    },
    { key: 'size', label: 'Size', value: capitalize(creep.sizeClass) },
    { key: 'move', label: 'Moves', value: capitalize(creep.moveType) },
    { key: 'reward', label: 'Kill reward', value: `${creep.rewardGold}g`, tone: 'gold' },
    { key: 'send', label: 'Send cost', value: `${creep.economy.sendCost}g`, tone: 'gold' },
    { key: 'income', label: 'Income', value: `+${creep.economy.incomeBonus}`, tone: 'success' },
    { key: 'cap', label: 'Per wave', value: `${creep.economy.perWaveCap} max` },
    { key: 'unlock', label: 'Unlocks', value: `Wave ${creep.economy.unlockWave}` },
  ];
}

export function CreepCard({ creep, faction }: CreepCardProps) {
  return (
    <article className={styles.card} aria-label={creep.name} data-creep-card={creep.id}>
      <header className={styles.cardHeader}>
        <UnitIcon
          unitId={creep.id}
          label={creep.name}
          faction={faction}
          className={styles.cardIcon}
        />
        <div className={styles.cardTitleBlock}>
          <h3 className={styles.cardName}>{creep.name}</h3>
          <span className={styles.cardSubtitle}>
            {capitalize(creep.moveType)} · {capitalize(creep.sizeClass)}
          </span>
        </div>
        <span className={styles.tierBadge} aria-label={`Tier ${creep.tier}`}>
          T{creep.tier}
        </span>
      </header>
      <StatGrid cells={creepStats(creep)} />
      {creep.talentBranches.length > 0 && (
        <div className={styles.branches}>
          <span className={styles.branchesLabel}>Talents, choose one per match</span>
          <div className={styles.branchList} role="group" aria-label="Talent branches">
            {creep.talentBranches.map((branch) => (
              <CreepBranchTable key={branch.id} branch={branch} />
            ))}
          </div>
        </div>
      )}
      {creep.description && <p className={styles.cardDescription}>{creep.description}</p>}
      {creep.lore && <p className={styles.cardLore}>{creep.lore}</p>}
    </article>
  );
}
