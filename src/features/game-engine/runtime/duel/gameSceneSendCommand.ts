import {
  getSendCapPerWave,
  getUnitTypeSendCapByTier,
  sendCreep,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { getRaceRegistry } from '../../../../entities/race-registry';
import { resolveUnitConfigById } from '../../../../entities/unit';
import type { RaceId } from '../../../../shared/types/content-ids';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import { toSendQueueItems } from './duelSideEvents';
import { publishPlayerSendLimits } from './gameSceneSendLimits';

export type SendCreepCommandDeps = {
  syncDuelPlayerGoldFromWallet: () => void;
  getDuelMatchState: () => DuelMatchState;
  setDuelMatchState: (state: DuelMatchState) => void;
  isMatchOver: () => boolean;
  canPerformBuildActions: () => boolean;
  getBuilderFactionId: () => RaceId;
  onGoldUpdated: (nextGold: number) => void;
  onHudChanged: () => void;
};

export function handleSendCreepCommand(deps: SendCreepCommandDeps, creepTypeId: string): void {
  deps.syncDuelPlayerGoldFromWallet();
  if (deps.isMatchOver()) {
    publishGameEvent('creep-send-rejected', {
      creepTypeId,
      reason: 'match_over',
      gold: deps.getDuelMatchState().player.gold,
    });
    return;
  }

  if (!deps.canPerformBuildActions()) {
    publishGameEvent('creep-send-rejected', {
      creepTypeId,
      reason: 'not_build_phase',
      gold: deps.getDuelMatchState().player.gold,
    });
    return;
  }

  const builderRace = getRaceRegistry(deps.getBuilderFactionId());
  const sendableCreepTypeId = builderRace.sendableCreepIds.find(
    (candidate) => candidate === creepTypeId,
  );
  if (!sendableCreepTypeId) {
    publishGameEvent('creep-send-rejected', {
      creepTypeId,
      reason: 'invalid_creep',
      gold: deps.getDuelMatchState().player.gold,
    });
    return;
  }

  const unit = resolveUnitConfigById(sendableCreepTypeId);
  const result = sendCreep(deps.getDuelMatchState(), true, unit.id, unit.tier, {
    freeNthSend: unit.abilities?.freeNthSend,
  });
  if (!result.sent) {
    const gold = deps.getDuelMatchState().player.gold;
    if (result.rejectionReason === 'wave_send_cap') {
      publishGameEvent('creep-send-rejected', {
        creepTypeId,
        reason: 'wave_send_cap',
        gold,
        sendLimit: getSendCapPerWave(),
      });
      return;
    }
    if (result.rejectionReason === 'unit_type_send_cap') {
      publishGameEvent('creep-send-rejected', {
        creepTypeId,
        reason: 'unit_type_send_cap',
        gold,
        sendLimit: getUnitTypeSendCapByTier(unit.tier),
      });
      return;
    }
    publishGameEvent('creep-send-rejected', {
      creepTypeId,
      reason: 'insufficient_gold',
      gold,
      requiredGold: result.cost,
    });
    return;
  }

  const previousIncome = deps.getDuelMatchState().player.income;
  const nextState = result.state;
  deps.setDuelMatchState(nextState);
  deps.onGoldUpdated(nextState.player.gold);
  publishGameEvent('send-queue-updated', {
    owner: 'player',
    queue: toSendQueueItems(nextState.player.sendQueue),
  });
  publishPlayerSendLimits(nextState, deps.getBuilderFactionId());
  publishGameEvent('income-updated', {
    owner: 'player',
    income: nextState.player.income,
    delta: nextState.player.income - previousIncome,
  });
  deps.onHudChanged();
}
