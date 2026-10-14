import type { FactionThemeName } from '../../../shared/constants/theme';
import { UnitIcon } from '../../../shared/ui/unit-icon';
import type { CreepCardViewModel } from '../model/types';
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
    { key: 'armor', label: 'Armor', value: `${creep.armor} ${capitalize(creep.armorType)}` },
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
      {creep.description && <p className={styles.cardDescription}>{creep.description}</p>}
      {creep.lore && <p className={styles.cardLore}>{creep.lore}</p>}
    </article>
  );
}
