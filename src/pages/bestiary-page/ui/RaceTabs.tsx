import { useRef, type KeyboardEvent } from 'react';
import type { RaceId } from '../../../shared/types/content-ids';
import type { RaceBestiaryViewModel } from '../model/types';
import { raceAccentClass } from './codex/raceAccentClass';
import { racePanelId, raceTabId } from './raceTabIds';
import styles from './BestiaryPage.module.css';
import { FactionEmblem } from '../../../shared/ui/faction-emblem';

/** Side of the race emblem next to a tab's race name, in px. */
const TAB_EMBLEM_SIZE = 18;

export type RaceTabsProps = {
  races: readonly RaceBestiaryViewModel[];
  selectedRaceId: RaceId;
  onSelect: (raceId: RaceId) => void;
};

function nextIndexForKey(key: string, currentIndex: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Sticky race switcher: a roving-tabindex tablist the arrow keys walk. */
export function RaceTabs({ races, selectedRaceId, onSelect }: RaceTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number): void {
    const nextIndex = nextIndexForKey(event.key, currentIndex, races.length);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const nextRace = races[nextIndex];
    onSelect(nextRace.raceId);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.tabs} role="tablist" aria-label="Race">
      {races.map((race, index) => {
        const isSelected = race.raceId === selectedRaceId;
        return (
          <button
            key={race.raceId}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={raceTabId(race.raceId)}
            aria-selected={isSelected}
            aria-controls={racePanelId(race.raceId)}
            tabIndex={isSelected ? 0 : -1}
            className={`${styles.tab} ${raceAccentClass(race.faction)}${isSelected ? ` ${styles.tabSelected}` : ''}`}
            onClick={() => onSelect(race.raceId)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            data-sound="ui.faction_select"
          >
            <FactionEmblem
              race={race.raceId}
              size={TAB_EMBLEM_SIZE}
              decorative
              className={styles.tabEmblem}
            />
            <span className={styles.tabLabel}>{race.name}</span>
          </button>
        );
      })}
    </div>
  );
}
