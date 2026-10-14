import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AppRoute } from '../../../shared/config/game-setup';
import { RaceId } from '../../../shared/types/content-ids';
import { buildBestiaryViewModel } from '../model/buildBestiaryViewModel';
import type { BestiaryViewModel } from '../model/types';
import { CreepCard } from './CreepCard';
import { TowerCard } from './TowerCard';
import { RaceTabs } from './RaceTabs';
import { racePanelId, raceTabId } from './raceTabIds';
import styles from './BestiaryPage.module.css';

export type BestiaryPageProps = {
  onNavigate: (route: AppRoute) => void;
  /** Overrides the content-backed view model; tests pass fixtures here. */
  viewModel?: BestiaryViewModel;
};

export function BestiaryPage({ onNavigate, viewModel }: BestiaryPageProps) {
  const resolvedViewModel = useMemo(() => viewModel ?? buildBestiaryViewModel(), [viewModel]);
  const [selectedRaceId, setSelectedRaceId] = useState<RaceId>(
    resolvedViewModel.races[0]?.raceId ?? RaceId.UNDEAD,
  );
  const race =
    resolvedViewModel.races.find((candidate) => candidate.raceId === selectedRaceId) ??
    resolvedViewModel.races[0];
  const pageRef = useRef<HTMLElement | null>(null);

  // A new race starts at the top of its codex, not wherever the last one was scrolled to.
  const handleSelectRace = useCallback((raceId: RaceId) => {
    setSelectedRaceId(raceId);
    const page = pageRef.current;
    if (page && typeof page.scrollTo === 'function') {
      page.scrollTo({ top: 0 });
    }
  }, []);

  return (
    <main className={styles.page} ref={pageRef}>
      <div className={styles.stickyTop}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => onNavigate('start')}
            aria-label="Go back"
            data-sound="ui.close"
          >
            {'<'}
          </button>
          <h1 className={styles.title}>Bestiary</h1>
          <div className={styles.headerSpacer} aria-hidden="true" />
        </header>
        <RaceTabs
          races={resolvedViewModel.races}
          selectedRaceId={selectedRaceId}
          onSelect={handleSelectRace}
        />
      </div>

      {race && (
        <div
          key={race.raceId}
          className={styles.panel}
          role="tabpanel"
          id={racePanelId(race.raceId)}
          aria-labelledby={raceTabId(race.raceId)}
          style={{ '--race-theme': race.themeColor } as CSSProperties}
        >
          <p className={styles.raceDescription}>{race.description}</p>

          <section
            className={styles.section}
            aria-labelledby={`${racePanelId(race.raceId)}-creeps`}
          >
            <h2 id={`${racePanelId(race.raceId)}-creeps`} className={styles.sectionTitle}>
              Creeps
              <span className={styles.sectionCount}>{race.creeps.length}</span>
            </h2>
            <div className={styles.cards}>
              {race.creeps.map((creep) => (
                <CreepCard key={creep.id} creep={creep} faction={race.faction} />
              ))}
            </div>
          </section>

          <section
            className={styles.section}
            aria-labelledby={`${racePanelId(race.raceId)}-towers`}
          >
            <h2 id={`${racePanelId(race.raceId)}-towers`} className={styles.sectionTitle}>
              Towers
              <span className={styles.sectionCount}>{race.towers.length}</span>
            </h2>
            <div className={styles.cards}>
              {race.towers.map((tower) => (
                <TowerCard key={tower.id} tower={tower} faction={race.faction} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
