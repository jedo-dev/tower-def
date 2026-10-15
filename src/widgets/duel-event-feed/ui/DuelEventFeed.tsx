import { memo, useEffect, useRef, useState } from 'react';
import styles from './DuelEventFeed.module.css';
import { onGameEvent } from '../../../shared/lib/game-bridge/bridge';
import {
  appendFeedEntry,
  clearFeedEntries,
  formatBuildRejected,
  formatIncomeUpdated,
  formatLivesStolen,
  formatOpponentHpUpdated,
  formatRoundSettled,
  formatSendQueueUpdated,
  formatSendRejected,
  selectPreviewEntries,
  type DuelFeedEntry,
  type DuelFeedEntryKind,
} from '../model/duelEventFeed';

export const DUEL_EVENT_FEED_LABEL = 'Duel events';
export const DUEL_EVENT_FEED_EMPTY_TEXT = 'No duel events yet';

const ENTRY_KIND_CLASS: Record<DuelFeedEntryKind, string> = {
  send: '',
  income: styles.entryIncome,
  damage: styles.entryDamage,
  rejected: styles.entryRejected,
  summary: styles.entrySummary,
};

/**
 * Event strip between the battlefield and the control panels: it never sits
 * over board cells. Collapsed it shows the newest lines on a dark backing;
 * the toggle opens the whole bounded history.
 */
function DuelEventFeedComponent() {
  const [entries, setEntries] = useState<DuelFeedEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const nextIdRef = useRef(1);

  useEffect(() => {
    function push(kind: DuelFeedEntryKind, text: string | null): void {
      if (text === null) {
        return;
      }
      const entry: DuelFeedEntry = { id: nextIdRef.current, kind, text };
      nextIdRef.current += 1;
      setEntries((current) => appendFeedEntry(current, entry));
    }

    const unsubscribeQueue = onGameEvent('send-queue-updated', (payload) => {
      push('send', formatSendQueueUpdated(payload));
    });
    const unsubscribeIncome = onGameEvent('income-updated', (payload) => {
      push('income', formatIncomeUpdated(payload));
    });
    const unsubscribeHp = onGameEvent('opponent-hp-updated', (payload) => {
      push('damage', formatOpponentHpUpdated(payload));
    });
    const unsubscribeLivesStolen = onGameEvent('lives-stolen', (payload) => {
      push('damage', formatLivesStolen(payload));
    });
    const unsubscribeRejected = onGameEvent('creep-send-rejected', (payload) => {
      push('rejected', formatSendRejected(payload));
    });
    const unsubscribeBuildRejected = onGameEvent('build-rejected', (payload) => {
      push('rejected', formatBuildRejected(payload));
    });
    const unsubscribeRoundSettled = onGameEvent('round-settled', (payload) => {
      push('summary', formatRoundSettled(payload));
    });
    // A rematch is a new match: the previous one's entries do not carry over.
    const unsubscribeMatchStarted = onGameEvent('match-started', () => {
      setEntries(clearFeedEntries());
    });

    return () => {
      unsubscribeMatchStarted();
      unsubscribeQueue();
      unsubscribeIncome();
      unsubscribeHp();
      unsubscribeLivesStolen();
      unsubscribeRejected();
      unsubscribeBuildRejected();
      unsubscribeRoundSettled();
    };
  }, []);

  const visibleEntries = isExpanded ? entries : selectPreviewEntries(entries);
  const canExpand = entries.length > visibleEntries.length || isExpanded;

  return (
    <section
      className={`${styles.feed}${isExpanded ? ` ${styles.feedExpanded}` : ''}`}
      aria-label={DUEL_EVENT_FEED_LABEL}
    >
      {entries.length === 0 ? (
        <p className={styles.empty}>{DUEL_EVENT_FEED_EMPTY_TEXT}</p>
      ) : (
        <div className={styles.entries} role="log" aria-live="polite">
          {visibleEntries.map((entry) => (
            <div
              key={entry.id}
              className={`${styles.entry}${ENTRY_KIND_CLASS[entry.kind] ? ` ${ENTRY_KIND_CLASS[entry.kind]}` : ''}`}
            >
              {entry.text}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.toggle}
        aria-label={isExpanded ? 'Show latest duel events' : 'Show all duel events'}
        aria-expanded={isExpanded}
        disabled={!canExpand}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span
          className={`${styles.toggleIcon}${isExpanded ? ` ${styles.toggleIconDown}` : ''}`}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}

export const DuelEventFeed = memo(DuelEventFeedComponent);
