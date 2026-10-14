import {
  clearSendQueue,
  countRemainingSendsOfUnit,
  countRemainingWaveSends,
  getSendCapPerWave,
  getUnitTypeSendCapByTier,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { getRaceRegistry } from '../../../../entities/race-registry';
import { resolveUnitConfigById, type UnitId } from '../../../../entities/unit';
import type { RaceId } from '../../../../shared/types/content-ids';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type { CreepSendLimitsSnapshot } from '../../../../shared/lib/game-bridge/types';

/** Pure: the player's remaining send capacity for the queue it has built this wave. */
export function buildPlayerSendLimits(
  sendQueue: readonly UnitId[],
  builderFactionId: RaceId,
): CreepSendLimitsSnapshot {
  const race = getRaceRegistry(builderFactionId);
  return {
    owner: 'player',
    waveSendCap: getSendCapPerWave(),
    waveSendsRemaining: countRemainingWaveSends(sendQueue),
    units: race.sendableCreepIds.map((creepTypeId) => {
      const unit = resolveUnitConfigById(creepTypeId);
      return {
        creepTypeId,
        cap: getUnitTypeSendCapByTier(unit.tier),
        remaining: countRemainingSendsOfUnit(sendQueue, creepTypeId, unit.tier),
      };
    }),
  };
}

/**
 * Wave start: the queues have been routed and spawned, so clear them and tell
 * the UI the limits are back to full.
 */
export function resetSendQueuesForWaveStart(
  state: DuelMatchState,
  builderFactionId: RaceId,
): DuelMatchState {
  const nextState = clearSendQueue(state);
  publishPlayerSendLimits(nextState, builderFactionId);
  return nextState;
}

/** Call on change only: after a send, the wave-start reset and a match (re)start. */
export function publishPlayerSendLimits(state: DuelMatchState, builderFactionId: RaceId): void {
  publishGameEvent(
    'send-limits-updated',
    buildPlayerSendLimits(state.player.sendQueue, builderFactionId),
  );
}
