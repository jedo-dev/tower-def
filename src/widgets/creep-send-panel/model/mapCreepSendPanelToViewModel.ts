import type { GameSetupConfig } from '../../../shared/config/game-setup';
import type {
  CreepSendLimitsSnapshot,
  CreepSendUnitLimit,
  GameHudSnapshot,
  WaveQueueItem,
} from '../../../shared/lib/game-bridge/types';
import { RaceId } from '../../../shared/types/content-ids';
import { getRaceRegistry } from '../../../entities/race-registry';
import { getIncomeBonusByTier, getSendCostByTier } from '../../../entities/duel-match';
import { resolveUnitConfigById } from '../../../entities/unit';
import type { UnitId } from '../../../entities/unit';
import type { FactionThemeName } from '../../../shared/constants/theme';

export type CreepSendButtonViewModel = {
  creepTypeId: UnitId;
  name: string;
  tier: number;
  cost: number;
  incomeGain: number;
  isAffordable: boolean;
  /** Remaining sends of this type this wave; null until the scene publishes limits. */
  remainingOfType: number | null;
  typeCap: number | null;
  isAtSendLimit: boolean;
  isDisabled: boolean;
  disabledReason: string | null;
  ariaLabel: string;
};

export type CreepSendPanelViewModel = {
  raceName: string;
  faction: FactionThemeName;
  gold: number;
  income: number;
  isBattleActive: boolean;
  queueCount: number;
  queueSummary: string;
  /** "7/12 left" for the wave; null until the scene publishes limits. */
  waveCapacitySummary: string | null;
  waveCapacityAriaLabel: string | null;
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

function findUnitLimit(
  limits: CreepSendLimitsSnapshot | null,
  creepTypeId: UnitId,
): CreepSendUnitLimit | null {
  return limits?.units.find((unitLimit) => unitLimit.creepTypeId === creepTypeId) ?? null;
}

function resolveDisabledReason(
  isBattleActive: boolean,
  isWaveCapReached: boolean,
  isAtTypeCap: boolean,
  isAffordable: boolean,
  cost: number,
): string | null {
  // Short enough to fit two 9px lines on a creep card at 360px.
  if (isBattleActive) {
    return 'locked in battle';
  }
  if (isWaveCapReached) {
    return 'wave limit reached';
  }
  if (isAtTypeCap) {
    return 'send limit reached';
  }
  if (!isAffordable) {
    return `requires ${cost} gold`;
  }
  return null;
}

export function mapCreepSendPanelToViewModel(
  snapshot: GameHudSnapshot,
  setup: GameSetupConfig | null,
  sendLimits: CreepSendLimitsSnapshot | null = null,
): CreepSendPanelViewModel {
  const raceId = resolveBuilderRace(setup);
  const race = getRaceRegistry(raceId);
  const isBattleActive = snapshot.phase === 'wave';
  const isWaveCapReached = sendLimits !== null && sendLimits.waveSendsRemaining <= 0;
  const buttons = race.sendableCreepIds.map((creepTypeId): CreepSendButtonViewModel => {
    const unit = resolveUnitConfigById(creepTypeId);
    const cost = getSendCostByTier(unit.tier);
    const incomeGain = getIncomeBonusByTier(unit.tier);
    const isAffordable = snapshot.gold >= cost;
    const unitLimit = findUnitLimit(sendLimits, creepTypeId);
    const isAtTypeCap = unitLimit !== null && unitLimit.remaining <= 0;
    const disabledReason = resolveDisabledReason(
      isBattleActive,
      isWaveCapReached,
      isAtTypeCap,
      isAffordable,
      cost,
    );
    const remainingSuffix = unitLimit ? `, ${unitLimit.remaining} of ${unitLimit.cap} left` : '';

    return {
      creepTypeId,
      name: unit.name,
      tier: unit.tier,
      cost,
      incomeGain,
      isAffordable,
      remainingOfType: unitLimit?.remaining ?? null,
      typeCap: unitLimit?.cap ?? null,
      isAtSendLimit: isWaveCapReached || isAtTypeCap,
      isDisabled: disabledReason !== null,
      disabledReason,
      ariaLabel: disabledReason
        ? `Cannot send ${unit.name}: ${disabledReason}`
        : `Send ${unit.name} for ${cost} gold and gain ${incomeGain} income${remainingSuffix}`,
    };
  });

  return {
    raceName: race.name,
    faction: raceId.toLowerCase() as FactionThemeName,
    gold: snapshot.gold,
    income: snapshot.income,
    isBattleActive,
    queueCount: snapshot.playerSendQueue.length,
    queueSummary: summarizeQueue(snapshot.playerSendQueue),
    waveCapacitySummary: sendLimits
      ? `${sendLimits.waveSendsRemaining}/${sendLimits.waveSendCap} left`
      : null,
    waveCapacityAriaLabel: sendLimits
      ? `${sendLimits.waveSendsRemaining} of ${sendLimits.waveSendCap} sends left this wave`
      : null,
    buttons,
  };
}
