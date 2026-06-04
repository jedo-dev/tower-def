import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type { GameHudSnapshot, WaveQueueItem } from '../../../shared/lib/game-bridge/types';
import { RaceId } from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../../entities/race-registry';
import { getIncomeBonusByTier, getSendCostByTier } from '../../../entities/duel-match';
import { resolveUnitConfigById } from '../../../entities/unit';
import type { UnitId } from '../../../entities/unit';

export type CreepSendButtonViewModel = {
  creepTypeId: UnitId;
  name: string;
  tier: number;
  cost: number;
  incomeGain: number;
  isAffordable: boolean;
  isDisabled: boolean;
  disabledReason: string | null;
  ariaLabel: string;
};

export type CreepSendPanelViewModel = {
  raceName: string;
  gold: number;
  income: number;
  isBattleActive: boolean;
  queueCount: number;
  queueSummary: string;
  buttons: CreepSendButtonViewModel[];
};

function resolveBuilderRace(setup: GameSetupConfig | null): RaceId {
  return setup?.builderFaction ?? RaceId.UNDEAD;
}

function summarizeQueue(queue: WaveQueueItem[]): string {
  if (queue.length === 0) {
    return 'No sends queued';
  }

  return `${queue.length} queued`;
}

export function mapCreepSendPanelToViewModel(
  snapshot: GameHudSnapshot,
  setup: GameSetupConfig | null,
): CreepSendPanelViewModel {
  const race = getRaceRegistry(resolveBuilderRace(setup));
  const isBattleActive = snapshot.phase === 'wave';
  const buttons = race.sendableCreepIds.map((creepTypeId) => {
    const unit = resolveUnitConfigById(creepTypeId);
    const cost = getSendCostByTier(unit.tier);
    const incomeGain = getIncomeBonusByTier(unit.tier);
    const isAffordable = snapshot.gold >= cost;
    const isDisabled = isBattleActive || !isAffordable;
    const disabledReason = isBattleActive
      ? 'sending is locked during battle'
      : !isAffordable
        ? `requires ${cost} gold`
        : null;

    return {
      creepTypeId,
      name: unit.name,
      tier: unit.tier,
      cost,
      incomeGain,
      isAffordable,
      isDisabled,
      disabledReason,
      ariaLabel: disabledReason
        ? `Cannot send ${unit.name}: ${disabledReason}`
        : `Send ${unit.name} for ${cost} gold and gain ${incomeGain} income`,
    };
  });

  return {
    raceName: race.name,
    gold: snapshot.gold,
    income: snapshot.income,
    isBattleActive,
    queueCount: snapshot.playerSendQueue.length,
    queueSummary: summarizeQueue(snapshot.playerSendQueue),
    buttons,
  };
}
