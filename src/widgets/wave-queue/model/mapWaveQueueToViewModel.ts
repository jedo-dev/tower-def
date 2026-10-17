import { tryResolveUnitConfigById, type UnitId } from '../../../entities/unit';
import type { FactionThemeName } from '../../../shared/constants/theme';
import type { GameHudSnapshot, WaveQueueItem } from '../../../shared/lib/game-bridge/types';

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

export type WaveQueueViewModel = {
  headerLabel: string;
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
    return {
      headerLabel,
      countLabel: pendingCreepCount > 0 ? `${pendingCreepCount} creeps` : null,
      baselineHint: null,
      sections: items.length > 0 ? [{ key: 'live', label: 'Incoming', items }] : [],
      emptyText: isPlayerFieldClear && !isEnemyFieldFighting ? 'No enemies' : null,
      enemyFieldStatus: isEnemyFieldFighting
        ? formatEnemyFieldStatus(opponentFieldRemaining)
        : null,
    };
  }

  if (snapshot.phase === 'build') {
    const enemySendItems = snapshot.opponentSendQueue.map(toWaveQueueIcon);
    return {
      headerLabel: `Next: ${headerLabel}`,
      countLabel: enemySendItems.length > 0 ? `+${enemySendItems.length} enemy sends` : null,
      baselineHint: 'Baseline wave',
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
    countLabel: null,
    baselineHint: null,
    sections: [],
    emptyText: 'No enemies',
    enemyFieldStatus: null,
  };
}
