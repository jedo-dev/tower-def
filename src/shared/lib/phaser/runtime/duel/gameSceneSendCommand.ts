import {
  getSendCostByTier,
  sendCreep,
  type DuelMatchState,
} from '../../../../../entities/duel-match';
import { getRaceRegistry } from '../../../../../entities/race-registry';
import { resolveUnitConfigById } from '../../../../../entities/unit';
import type { RaceId } from '../../../../types/content-ids';
import { publishGameEvent } from '../../../game-bridge/bridge';

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
  const result = sendCreep(deps.getDuelMatchState(), true, unit.id, unit.tier);
  if (!result.sent) {
    publishGameEvent('creep-send-rejected', {
      creepTypeId,
      reason: 'insufficient_gold',
      gold: deps.getDuelMatchState().player.gold,
      requiredGold: getSendCostByTier(unit.tier),
    });
    return;
  }

  const previousIncome = deps.getDuelMatchState().player.income;
  const nextState = result.state;
  deps.setDuelMatchState(nextState);
  deps.onGoldUpdated(nextState.player.gold);
  publishGameEvent('send-queue-updated', {
    owner: 'player',
    queue: nextState.player.sendQueue.map((queuedCreepTypeId, index) => ({
      creepTypeId: queuedCreepTypeId,
      index,
    })),
  });
  publishGameEvent('income-updated', {
    owner: 'player',
    income: nextState.player.income,
    delta: nextState.player.income - previousIncome,
  });
  deps.onHudChanged();
}
