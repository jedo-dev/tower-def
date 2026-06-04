import type { UnitConfig, UnitId } from '../../unit/model/types';
import { resolveUnitConfigById } from '../../unit/model/registry';
import type {
  WaveComposition,
  WaveCompositionEntry,
  WavePreviewSummary,
  WavePreviewUnitLine,
} from './composition';

export type ComposeWaveInput = {
  waveId: string;
  round: number;
  baselineUnits: readonly UnitConfig[];
  playerSendQueue: readonly UnitId[];
  opponentSendQueue: readonly UnitId[];
};

function resolveSendQueueToEntries(
  queue: readonly UnitId[],
  source: 'player-send' | 'opponent-send',
): WaveCompositionEntry[] {
  return queue.map((unitId) => ({
    unit: resolveUnitConfigById(unitId),
    source,
  }));
}

export function composeWave(input: ComposeWaveInput): WaveComposition {
  const baselineEntries: WaveCompositionEntry[] = input.baselineUnits.map((unit) => ({
    unit,
    source: 'baseline' as const,
  }));

  const playerSendEntries = resolveSendQueueToEntries(
    input.playerSendQueue,
    'player-send',
  );

  const opponentSendEntries = resolveSendQueueToEntries(
    input.opponentSendQueue,
    'opponent-send',
  );

  return {
    waveId: input.waveId,
    round: input.round,
    entries: [...baselineEntries, ...playerSendEntries, ...opponentSendEntries],
  };
}

function createPreviewLineKey(unitId: UnitId, source: WaveCompositionEntry['source']): string {
  return `${unitId}::${source}`;
}

export function buildWavePreview(composition: WaveComposition): WavePreviewSummary {
  const lineMap = new Map<string, WavePreviewUnitLine>();
  let baselineCount = 0;
  let playerSendCount = 0;
  let opponentSendCount = 0;

  for (const entry of composition.entries) {
    const key = createPreviewLineKey(entry.unit.id, entry.source);
    const existing = lineMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      lineMap.set(key, {
        unitId: entry.unit.id,
        name: entry.unit.name,
        tier: entry.unit.tier,
        count: 1,
        source: entry.source,
      });
    }

    switch (entry.source) {
      case 'baseline':
        baselineCount += 1;
        break;
      case 'player-send':
        playerSendCount += 1;
        break;
      case 'opponent-send':
        opponentSendCount += 1;
        break;
    }
  }

  const lines = Array.from(lineMap.values()).sort((left, right) => {
    if (left.source !== right.source) {
      const sourceOrder: Record<string, number> = {
        'baseline': 0,
        'player-send': 1,
        'opponent-send': 2,
      };
      return sourceOrder[left.source] - sourceOrder[right.source];
    }
    if (left.tier !== right.tier) {
      return left.tier - right.tier;
    }
    return left.name.localeCompare(right.name);
  });

  return {
    waveId: composition.waveId,
    round: composition.round,
    totalCount: composition.entries.length,
    lines,
    baselineCount,
    playerSendCount,
    opponentSendCount,
  };
}
