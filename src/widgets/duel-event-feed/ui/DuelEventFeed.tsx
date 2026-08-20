import { memo, useEffect, useRef, useState } from 'react';
import styles from './DuelEventFeed.module.css';
import { onGameEvent } from '../../../shared/lib/game-bridge/bridge';
import {
  appendFeedEntry,
  formatIncomeUpdated,
  formatOpponentHpUpdated,
  formatSendQueueUpdated,
  formatSendRejected,
  type DuelFeedEntry,
  type DuelFeedEntryKind,
} from '../model/duelEventFeed';

const ENTRY_KIND_CLASS: Record<DuelFeedEntryKind, string> = {
  send: '',
  income: styles.entryIncome,
  damage: styles.entryDamage,
  rejected: styles.entryRejected,
};

function DuelEventFeedComponent() {
  const [entries, setEntries] = useState<DuelFeedEntry[]>([]);
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
    const unsubscribeRejected = onGameEvent('creep-send-rejected', (payload) => {
      push('rejected', formatSendRejected(payload));
    });

    return () => {
      unsubscribeQueue();
      unsubscribeIncome();
      unsubscribeHp();
      unsubscribeRejected();
    };
  }, []);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.feed} role="log" aria-label="Duel events" aria-live="polite">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`${styles.entry}${ENTRY_KIND_CLASS[entry.kind] ? ` ${ENTRY_KIND_CLASS[entry.kind]}` : ''}`}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}

export const DuelEventFeed = memo(DuelEventFeedComponent);
