import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { CodexEntryRef } from '../../model/codexNavigation';
import { stepCodexEntry } from '../../model/codexNavigation';
import type { RaceBestiaryViewModel } from '../../model/types';
import { CodexIcon } from '../codex/CodexIcon';
import { raceAccentClass } from '../codex/raceAccentClass';
import codex from '../codex/Codex.module.css';
import { CreepDetail } from './CreepDetail';
import { TowerDetail } from './TowerDetail';
import styles from './Detail.module.css';

export type CodexDetailProps = {
  race: RaceBestiaryViewModel;
  entry: CodexEntryRef;
  onNavigate: (entry: CodexEntryRef) => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const KIND_LABELS = { tower: 'Tower', creep: 'Creature' } as const;

/** Keeps Tab inside the dialog: the last control wraps to the first and back. */
function trapTab(event: KeyboardEvent<HTMLElement>): void {
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Full-screen detail of one tower or creature, with previous/next through
 * the same roster. Escape or the back arrow closes it.
 */
export function CodexDetail({ race, entry, onNavigate, onClose }: CodexDetailProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const roster = entry.kind === 'tower' ? race.towers : race.creeps;
  const current = roster[entry.index];
  const previous = roster[stepCodexEntry(entry, -1, roster.length).index];
  const next = roster[stepCodexEntry(entry, 1, roster.length).index];
  const nameId = `codex-detail-${current?.id ?? 'empty'}-name`;
  const kindLabel = KIND_LABELS[entry.kind];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!current || !previous || !next) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      trapTab(event);
    }
  }

  return (
    <div
      className={`${styles.dialog} ${raceAccentClass(race.faction)}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={nameId}
      onKeyDown={handleKeyDown}
    >
      <header className={styles.bar}>
        <button
          ref={closeRef}
          type="button"
          className={`${codex.frame} ${codex.pressable} ${styles.iconButton}`}
          aria-label="Back to Bestiary"
          onClick={onClose}
          data-sound="ui.close"
        >
          <CodexIcon name="chevronLeft" size="lg" tinted={false} />
        </button>
        <div className={styles.pager}>
          <span className={styles.pagerKicker}>{`${race.name} · ${kindLabel}`}</span>
          <span className={styles.pagerRow}>
            <span className={styles.dots} aria-hidden="true">
              {roster.map((item, index) => (
                <span
                  key={item.id}
                  className={index === entry.index ? `${styles.dot} ${styles.dotOn}` : styles.dot}
                />
              ))}
            </span>
            <span>{`${entry.index + 1} / ${roster.length}`}</span>
          </span>
        </div>
        <span aria-hidden="true" />
      </header>

      <div key={current.id} className={styles.scroll} data-codex-detail={current.id}>
        {entry.kind === 'tower' ? (
          <TowerDetail
            tower={race.towers[entry.index]}
            raceName={race.name}
            faction={race.faction}
            nameId={nameId}
          />
        ) : (
          <CreepDetail creep={race.creeps[entry.index]} faction={race.faction} nameId={nameId} />
        )}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={`${codex.frame} ${codex.pressable} ${styles.navButton}`}
          aria-label={`Previous ${kindLabel.toLowerCase()}: ${previous.name}`}
          onClick={() => onNavigate(stepCodexEntry(entry, -1, roster.length))}
        >
          <CodexIcon name="chevronLeft" size="lg" tinted={false} />
          <span className={styles.navText}>
            <span className={styles.navKicker}>Prev</span>
            <span className={styles.navName}>{previous.name}</span>
          </span>
        </button>
        <button
          type="button"
          className={`${codex.frame} ${codex.pressable} ${styles.navButton} ${styles.navNext}`}
          aria-label={`Next ${kindLabel.toLowerCase()}: ${next.name}`}
          onClick={() => onNavigate(stepCodexEntry(entry, 1, roster.length))}
        >
          <span className={styles.navText}>
            <span className={styles.navKicker}>Next</span>
            <span className={styles.navName}>{next.name}</span>
          </span>
          <CodexIcon name="chevronRight" size="lg" tinted={false} />
        </button>
      </footer>
    </div>
  );
}
