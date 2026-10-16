import { TowerIcon } from '../../../../shared/ui/tower-icon';
import { UnitIcon } from '../../../../shared/ui/unit-icon';
import type { CodexEntryRef } from '../../model/codexNavigation';
import { DAMAGE_STAT_KEYS } from '../../model/statReadings';
import type { RaceBestiaryViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { Portrait } from '../codex/Portrait';
import { SectionHead } from '../codex/SectionHead';
import { racePanelId } from '../raceTabIds';
import { UnitTile } from './UnitTile';
import styles from './Overview.module.css';

export type RaceOverviewProps = {
  race: RaceBestiaryViewModel;
  onOpenEntry: (entry: CodexEntryRef) => void;
};

function tierSpan(race: RaceBestiaryViewModel): string {
  const tiers = race.creeps.map((creep) => creep.tier);
  if (tiers.length === 0) {
    return '';
  }
  const lowest = Math.min(...tiers);
  const highest = Math.max(...tiers);
  return lowest === highest ? ` · T${lowest}` : ` · T${lowest}–T${highest}`;
}

/** The race's towers and creatures as compact tiles. */
export function RaceOverview({ race, onOpenEntry }: RaceOverviewProps) {
  const panelId = racePanelId(race.raceId);

  return (
    <div className={styles.overview}>
      <p className={styles.raceDescription}>{race.description}</p>

      <section className={styles.section} aria-labelledby={`${panelId}-towers`}>
        <SectionHead
          id={`${panelId}-towers`}
          title="Towers"
          meta={`${race.towers.length} · L1–L3 · G4–G7`}
        />
        <ul className={styles.grid}>
          {race.towers.map((tower, index) => (
            <li key={tower.id} data-tower-card={tower.id}>
              <UnitTile
                entryId={tower.id}
                name={tower.name}
                subtitle={`${tower.damageType.label} · ${tower.archetypeName}`}
                stats={tower.tileStats}
                onOpen={() => onOpenEntry({ kind: 'tower', index })}
                portrait={
                  <Portrait
                    badgeKind="type"
                    badge={<CodexIcon name={DAMAGE_STAT_KEYS[tower.damageType.type]} size="sm" />}
                  >
                    <TowerIcon
                      spriteKey={tower.spriteKey}
                      label={tower.name}
                      faction={race.faction}
                    />
                  </Portrait>
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby={`${panelId}-creeps`}>
        <SectionHead
          id={`${panelId}-creeps`}
          title="Creatures"
          meta={`${race.creeps.length}${tierSpan(race)}`}
        />
        <ul className={styles.grid}>
          {race.creeps.map((creep, index) => (
            <li key={creep.id} data-creep-card={creep.id}>
              <UnitTile
                entryId={creep.id}
                name={creep.name}
                subtitle={creep.traitsLabel}
                stats={creep.tileStats}
                onOpen={() => onOpenEntry({ kind: 'creep', index })}
                portrait={
                  <Portrait badge={`T${creep.tier}`}>
                    <UnitIcon unitId={creep.id} label={creep.name} faction={race.faction} />
                  </Portrait>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
