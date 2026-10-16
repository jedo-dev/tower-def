import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppRoute } from '../../../shared/config/game-setup';
import { RaceId } from '../../../shared/types/content-ids';
import { buildBestiaryViewModel } from '../model/buildBestiaryViewModel';
import type { CodexEntryRef } from '../model/codexNavigation';
import type { BestiaryViewModel, RaceBestiaryViewModel } from '../model/types';
import { CodexIcon } from './codex/CodexIcon';
import { raceAccentClass } from './codex/raceAccentClass';
import codex from './codex/Codex.module.css';
import { CodexDetail } from './detail/CodexDetail';
import { RaceOverview } from './overview/RaceOverview';
import { RaceTabs } from './RaceTabs';
import { racePanelId, raceTabId } from './raceTabIds';
import styles from './BestiaryPage.module.css';

export type BestiaryPageProps = {
  onNavigate: (route: AppRoute) => void;
  /** Overrides the content-backed view model; tests pass fixtures here. */
  viewModel?: BestiaryViewModel;
};

function entryId(race: RaceBestiaryViewModel, entry: CodexEntryRef): string | undefined {
  return (entry.kind === 'tower' ? race.towers : race.creeps)[entry.index]?.id;
}

export function BestiaryPage({ onNavigate, viewModel }: BestiaryPageProps) {
  const resolvedViewModel = useMemo(() => viewModel ?? buildBestiaryViewModel(), [viewModel]);
  const [selectedRaceId, setSelectedRaceId] = useState<RaceId>(
    resolvedViewModel.races[0]?.raceId ?? RaceId.UNDEAD,
  );
  const [openEntry, setOpenEntry] = useState<CodexEntryRef | null>(null);
  // The tile focus returns to when the detail closes: the entry last shown.
  const returnFocusIdRef = useRef<string | null>(null);
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

  const handleCloseDetail = useCallback(() => {
    if (race && openEntry) {
      returnFocusIdRef.current = entryId(race, openEntry) ?? null;
    }
    setOpenEntry(null);
  }, [race, openEntry]);

  useEffect(() => {
    const returnFocusId = returnFocusIdRef.current;
    if (openEntry !== null || returnFocusId === null) {
      return;
    }
    returnFocusIdRef.current = null;
    const tile = pageRef.current?.querySelector<HTMLElement>(
      `[data-codex-tile="${returnFocusId}"]`,
    );
    tile?.focus();
    tile?.scrollIntoView?.({ block: 'nearest' });
  }, [openEntry]);

  const accentClass = race ? raceAccentClass(race.faction) : '';

  return (
    <>
      <main
        className={`${styles.page} ${accentClass}`}
        ref={pageRef}
        inert={openEntry !== null}
        aria-hidden={openEntry !== null ? true : undefined}
      >
        <header className={styles.stickyTop}>
          <div className={styles.bar}>
            <button
              type="button"
              className={`${codex.frame} ${codex.pressable} ${styles.backButton}`}
              onClick={() => onNavigate('start')}
              aria-label="Go back"
              data-sound="ui.close"
            >
              <CodexIcon name="chevronLeft" size="lg" tinted={false} />
            </button>
            <h1 className={styles.title}>Bestiary</h1>
            <span aria-hidden="true" />
          </div>
          <RaceTabs
            races={resolvedViewModel.races}
            selectedRaceId={selectedRaceId}
            onSelect={handleSelectRace}
          />
        </header>

        {race && (
          <div
            key={race.raceId}
            role="tabpanel"
            id={racePanelId(race.raceId)}
            aria-labelledby={raceTabId(race.raceId)}
          >
            <RaceOverview race={race} onOpenEntry={setOpenEntry} />
          </div>
        )}
      </main>

      {race && openEntry && (
        <CodexDetail
          race={race}
          entry={openEntry}
          onNavigate={setOpenEntry}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}
