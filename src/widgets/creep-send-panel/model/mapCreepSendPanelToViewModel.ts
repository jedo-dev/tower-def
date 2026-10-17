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
import {
  getCreatureSendUnlockWave,
  isCreatureTierUnlocked,
} from '../../../shared/constants/creatureSendUnlock';
import { mapCreatureTalentState, type CreatureTalentViewModel } from './mapCreatureTalentState';

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
  /** The send unlock schedule still locks this tier for the coming wave. */
  isLocked: boolean;
  /** First wave this creature can be sent into (`CREATURE_SEND_UNLOCK_WAVE_BY_TIER`). */
  unlockWave: number;
  isDisabled: boolean;
  disabledReason: string | null;
  ariaLabel: string;
  /** Hover hint of the send chip: branch, grade and experience. */
  tooltip: string;
  talent: CreatureTalentViewModel;
};

export type CreepSendPanelViewModel = {
  raceId: RaceId;
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
  /** Some creature can choose a branch or buy a grade right now. */
  hasAffordableTalent: boolean;
  /** Unspent experience of each tier the roster sends, lowest tier first. */
  xpByTier: CreatureTierXpViewModel[];
};

export type CreatureTierXpViewModel = {
  tier: number;
  xp: number;
  label: string;
  ariaLabel: string;
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

type SendBlockers = {
  lockedUntilWave: number | null;
  isBattleActive: boolean;
  isWaveCapReached: boolean;
  isAtTypeCap: boolean;
  isAffordable: boolean;
  cost: number;
};

function resolveDisabledReason({
  lockedUntilWave,
  isBattleActive,
  isWaveCapReached,
  isAtTypeCap,
  isAffordable,
  cost,
}: SendBlockers): string | null {
  // Short enough to fit two 9px lines on a creep card at 360px.
  if (lockedUntilWave !== null) {
    return `from wave ${lockedUntilWave}`;
  }
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

function summarizeXpByTier(buttons: CreepSendButtonViewModel[]): CreatureTierXpViewModel[] {
  const tiers = [...new Set(buttons.map((button) => button.tier))].sort((a, b) => a - b);
  return tiers.map((tier) => {
    const xp = buttons.find((button) => button.tier === tier)?.talent.xp ?? 0;
    return { tier, xp, label: `T${tier} ${xp} XP`, ariaLabel: `Tier ${tier}: ${xp} XP` };
  });
}

/** "Grade 2 of 4, Skeleton I. 8 of 12 XP" for the send chip's label and tooltip. */
export function describeTalentForLabel(talent: CreatureTalentViewModel): string {
  const branch = talent.chosenBranch
    ? `Grade ${talent.grade} of ${talent.maxGrade}, ${talent.chosenBranch.name}`
    : 'No branch';
  const target = talent.action.cost;
  const xp = target === null ? `${talent.xp} XP` : `${talent.xp} of ${target} XP`;
  return `${branch}. ${xp}`;
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
  // The wave a send queued now joins: in the build phase the HUD already
  // shows the coming wave; mid-wave the next send waits for the one after.
  const sendWaveNumber = isBattleActive ? snapshot.waveNumber + 1 : snapshot.waveNumber;
  const buttons = race.sendableCreepIds.map((creepTypeId): CreepSendButtonViewModel => {
    const unit = resolveUnitConfigById(creepTypeId);
    const cost = getSendCostByTier(unit.tier);
    const incomeGain = getIncomeBonusByTier(unit.tier);
    const isAffordable = snapshot.gold >= cost;
    const unitLimit = findUnitLimit(sendLimits, creepTypeId);
    const isAtTypeCap = unitLimit !== null && unitLimit.remaining <= 0;
    const unlockWave = getCreatureSendUnlockWave(unit.tier);
    const isLocked = !isCreatureTierUnlocked(unit.tier, sendWaveNumber);
    const disabledReason = resolveDisabledReason({
      lockedUntilWave: isLocked ? unlockWave : null,
      isBattleActive,
      isWaveCapReached,
      isAtTypeCap,
      isAffordable,
      cost,
    });
    const remainingSuffix = unitLimit ? `, ${unitLimit.remaining} of ${unitLimit.cap} left` : '';
    const talent = mapCreatureTalentState(unit, snapshot);
    const talentSuffix = describeTalentForLabel(talent);

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
      isLocked,
      unlockWave,
      isDisabled: disabledReason !== null,
      disabledReason,
      ariaLabel: isLocked
        ? `${unit.name} locked: sendable from wave ${unlockWave}, costs ${cost} gold. ${talentSuffix}`
        : disabledReason
          ? `Cannot send ${unit.name}: ${disabledReason}. ${talentSuffix}`
          : `Send ${unit.name} for ${cost} gold and gain ${incomeGain} income${remainingSuffix}. ${talentSuffix}`,
      tooltip: `${unit.name}: ${talentSuffix}`,
      talent,
    };
  });

  return {
    raceId,
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
    hasAffordableTalent: buttons.some((button) => button.talent.action.isAffordable),
    xpByTier: summarizeXpByTier(buttons),
  };
}
