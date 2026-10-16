import type { FactionThemeName } from '../../../shared/constants/theme';
import { TowerIcon } from '../../../shared/ui/tower-icon';
import type { TowerCardViewModel } from '../model/types';
import { StatGrid, type StatCell } from './StatGrid';
import styles from './BestiaryPage.module.css';

export type TowerCardProps = {
  tower: TowerCardViewModel;
  faction: FactionThemeName;
};

const MILLISECONDS_PER_SECOND = 1000;

function towerStats(tower: TowerCardViewModel): StatCell[] {
  return [
    { key: 'cost', label: 'Cost', value: `${tower.cost}g`, tone: 'gold' },
    { key: 'damage', label: 'Damage', value: tower.damageLabel },
    {
      key: 'damage-type',
      label: 'Type',
      value: tower.damageType.label,
      glyph: tower.damageType.glyph,
      hint: tower.damageType.hint,
    },
    { key: 'range', label: 'Range', value: `${tower.rangeCells} cells` },
    {
      key: 'cooldown',
      label: 'Cooldown',
      value: `${(tower.cooldownMs / MILLISECONDS_PER_SECOND).toFixed(1)}s`,
    },
  ];
}

export function TowerCard({ tower, faction }: TowerCardProps) {
  return (
    <article className={styles.card} aria-label={tower.name} data-tower-card={tower.id}>
      <header className={styles.cardHeader}>
        <TowerIcon
          spriteKey={tower.spriteKey}
          label={tower.name}
          faction={faction}
          className={styles.cardIcon}
        />
        <div className={styles.cardTitleBlock}>
          <h3 className={styles.cardName}>{tower.name}</h3>
          <span className={styles.cardSubtitle}>{tower.archetypeName}</span>
        </div>
      </header>
      <StatGrid cells={towerStats(tower)} />
      {tower.specials.length > 0 && (
        <ul className={styles.specials} aria-label="Specials">
          {tower.specials.map((special) => (
            <li key={special.key} className={styles.special}>
              <span className={styles.specialLabel}>{special.label}</span>
              <span className={styles.specialValue}>{special.value}</span>
            </li>
          ))}
        </ul>
      )}
      <ol className={styles.levels} aria-label="Upgrade levels">
        {tower.levels.map((level) => (
          <li key={level.level} className={styles.level}>
            <span className={styles.levelBadge}>L{level.level}</span>
            <span className={styles.levelSummary}>{level.summary}</span>
            {level.upgradeCost !== null && (
              <span className={styles.levelCost}>{level.upgradeCost}g</span>
            )}
          </li>
        ))}
      </ol>
      {tower.talentBranches.length > 0 && (
        <div className={styles.branches}>
          <span className={styles.branchesLabel}>Grade 3 talents, choose one</span>
          <ul className={styles.branchList} aria-label="Talent branches">
            {tower.talentBranches.map((branch) => (
              <li key={branch.id} className={styles.branch}>
                {branch.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={styles.cardDescription}>{tower.description}</p>
      {tower.lore && <p className={styles.cardLore}>{tower.lore}</p>}
    </article>
  );
}
