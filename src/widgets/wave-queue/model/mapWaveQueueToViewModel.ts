import type { GameHudSnapshot, WaveQueueItem } from '../../../shared/lib/game-bridge/types';

export type WaveQueueSection = {
  key: 'live' | 'enemy-sends';
  label: string;
  items: WaveQueueItem[];
};

export type WaveQueueViewModel = {
  headerLabel: string;
  countLabel: string | null;
  baselineHint: string | null;
  sections: WaveQueueSection[];
  emptyText: string | null;
};

export function mapWaveQueueToViewModel(snapshot: GameHudSnapshot): WaveQueueViewModel {
  const headerLabel = `Wave ${snapshot.waveNumber}`;

  if (snapshot.phase === 'wave') {
    const items = snapshot.waveQueue ?? [];
    const pendingCreepCount = snapshot.pendingCreepCount ?? 0;
    return {
      headerLabel,
      countLabel: pendingCreepCount > 0 ? `${pendingCreepCount} creeps` : null,
      baselineHint: null,
      sections:
        items.length > 0 ? [{ key: 'live', label: 'Incoming', items }] : [],
      emptyText: items.length === 0 && pendingCreepCount === 0 ? 'No enemies' : null,
    };
  }

  if (snapshot.phase === 'build') {
    const enemySendItems = snapshot.opponentSendQueue.map((send, index) => ({
      type: send.type,
      index,
    }));
    return {
      headerLabel: `Next: ${headerLabel}`,
      countLabel:
        enemySendItems.length > 0 ? `+${enemySendItems.length} enemy sends` : null,
      baselineHint: 'Baseline wave',
      sections:
        enemySendItems.length > 0
          ? [{ key: 'enemy-sends', label: 'Enemy sends', items: enemySendItems }]
          : [],
      emptyText: null,
    };
  }

  return {
    headerLabel,
    countLabel: null,
    baselineHint: null,
    sections: [],
    emptyText: 'No enemies',
  };
}
