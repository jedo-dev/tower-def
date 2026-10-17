import { tryResolveUnitConfigById, type UnitId } from '../../../entities/unit';
import type { FactionThemeName } from '../../../shared/constants/theme';
import type { GameHudSnapshot, WaveQueueItem } from '../../../shared/lib/game-bridge/types';

const BASELINE_WAVE_HINT = 'Baseline wave';

/** One creature portrait in the strip. */
export type WaveQueueIcon = {
  creepTypeId: string;
  /** Display name for the portrait's label; the id when the unit is unknown. */
  name: string;
  faction: FactionThemeName | undefined;
};

export type WaveQueueSection = {
  key: 'live' | 'enemy-sends';
  label: string;
  items: WaveQueueIcon[];
};

/** One portrait of the plate's strip: a creature type and how many of it come. */
export type WaveQueueGroup = WaveQueueIcon & {
  count: number;
  /** "×4" */
  countLabel: string;
};

export type WaveQueueViewModel = {
  headerLabel: string;
  /** The plate's second line: "baseline + 3 enemy sends", "6 creeps", "No enemies". */
  subtitle: string | null;
  /** The sections' creatures grouped by type, in order of first appearance. */
  groups: WaveQueueGroup[];
  countLabel: string | null;
  baselineHint: string | null;
  sections: WaveQueueSection[];
  emptyText: string | null;
  /** Set once the player's field is clear but the computer's is still fighting. */
  enemyFieldStatus: string | null;
};

export function toWaveQueueIcon(item: WaveQueueItem): WaveQueueIcon {
  const unit = tryResolveUnitConfigById(item.creepTypeId as UnitId);
  return {
    creepTypeId: item.creepTypeId,
    name: unit?.name ?? item.creepTypeId,
    faction: unit ? (unit.faction.toLowerCase() as FactionThemeName) : undefined,
  };
}

/** Folds a queue into one portrait per creature type with its count. */
export function groupWaveQueueIcons(items: readonly WaveQueueIcon[]): WaveQueueGroup[] {
  const groups = new Map<string, WaveQueueGroup>();
  for (const item of items) {
    const group = groups.get(item.creepTypeId);
    if (group) {
      group.count += 1;
      group.countLabel = `×${group.count}`;
    } else {
      groups.set(item.creepTypeId, { ...item, count: 1, countLabel: '×1' });
    }
  }
  return [...groups.values()];
}

function formatEnemySendsSubtitle(sendCount: number): string {
  return `baseline + ${sendCount} enemy ${sendCount === 1 ? 'send' : 'sends'}`;
}

export function formatEnemyFieldStatus(remainingCreeps: number): string {
  return `Enemy field: ${remainingCreeps} left`;
}

/**
 * @param opponentFieldRemaining creeps the computer's field still has to
 * resolve; the wave only ends once both fields are clear.
 */
export function mapWaveQueueToViewModel(
  snapshot: GameHudSnapshot,
  opponentFieldRemaining = 0,
): WaveQueueViewModel {
  const headerLabel = `Wave ${snapshot.waveNumber}`;

  if (snapshot.phase === 'wave') {
    const items = (snapshot.waveQueue ?? []).map(toWaveQueueIcon);
    const pendingCreepCount = snapshot.pendingCreepCount ?? 0;
    const isPlayerFieldClear = items.length === 0 && pendingCreepCount === 0;
    const isEnemyFieldFighting = isPlayerFieldClear && opponentFieldRemaining > 0;
    const countLabel = pendingCreepCount > 0 ? `${pendingCreepCount} creeps` : null;
    const emptyText = isPlayerFieldClear && !isEnemyFieldFighting ? 'No enemies' : null;
    return {
      headerLabel,
      subtitle: countLabel ?? emptyText,
      groups: groupWaveQueueIcons(items),
      countLabel,
      baselineHint: null,
      sections: items.length > 0 ? [{ key: 'live', label: 'Incoming', items }] : [],
      emptyText,
      enemyFieldStatus: isEnemyFieldFighting
        ? formatEnemyFieldStatus(opponentFieldRemaining)
        : null,
    };
  }

  if (snapshot.phase === 'build') {
    const enemySendItems = snapshot.opponentSendQueue.map(toWaveQueueIcon);
    return {
      headerLabel: `Next: ${headerLabel}`,
      subtitle:
        enemySendItems.length > 0
          ? formatEnemySendsSubtitle(enemySendItems.length)
          : BASELINE_WAVE_HINT,
      groups: groupWaveQueueIcons(enemySendItems),
      countLabel: enemySendItems.length > 0 ? `+${enemySendItems.length} enemy sends` : null,
      baselineHint: BASELINE_WAVE_HINT,
      sections:
        enemySendItems.length > 0
          ? [{ key: 'enemy-sends', label: 'Enemy sends', items: enemySendItems }]
          : [],
      emptyText: null,
      enemyFieldStatus: null,
    };
  }

  return {
    headerLabel,
    subtitle: 'No enemies',
    groups: [],
    countLabel: null,
    baselineHint: null,
    sections: [],
    emptyText: 'No enemies',
    enemyFieldStatus: null,
  };
}
