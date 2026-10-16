import {
  clearSendQueue,
  countRemainingSendsOfUnit,
  countRemainingWaveSends,
  getSendCapPerWave,
  getUnitTypeSendCapByTier,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { getRaceRegistry } from '../../../../entities/race-registry';
import {
  getChosenCreatureBranchId,
  getCreatureBranchCost,
  getCreatureGrade,
  getNextCreatureGradeCost,
  NO_CREATURE_BRANCH_CHOICES,
  NO_CREATURE_GRADES,
  resolveUnitConfigById,
  type CreatureTalentLedger,
  type UnitConfig,
  type UnitId,
} from '../../../../entities/unit';
import type { RaceId } from '../../../../shared/types/content-ids';
import { publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import type {
  CreepSendLimitsSnapshot,
  CreepSendUnitLimit,
} from '../../../../shared/lib/game-bridge/types';

/** The talent picks and grades a send panel shows; the experience is in the HUD snapshot. */
export type PlayerCreatureTalents = Pick<
  CreatureTalentLedger,
  'creatureBranchChoices' | 'creatureGrades'
>;

const NO_PLAYER_CREATURE_TALENTS: PlayerCreatureTalents = {
  creatureBranchChoices: NO_CREATURE_BRANCH_CHOICES,
  creatureGrades: NO_CREATURE_GRADES,
};

function buildUnitTalents(
  unit: UnitConfig,
  talents: PlayerCreatureTalents,
): Pick<CreepSendUnitLimit, 'availableBranches' | 'branchCostXp' | 'grade' | 'nextUpgradeCostXp'> {
  const chosenId = getChosenCreatureBranchId(unit.id, talents.creatureBranchChoices);
  const grade = getCreatureGrade(unit.id, talents.creatureGrades);
  return {
    availableBranches: unit.talentBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      description: branch.description,
      isChosen: branch.id === chosenId,
    })),
    branchCostXp: getCreatureBranchCost(unit.tier),
    grade,
    nextUpgradeCostXp: getNextCreatureGradeCost(unit.tier, grade),
  };
}

/**
 * Pure: the player's remaining send capacity for the queue it has built this
 * wave, with each creature's talent branches and grade.
 */
export function buildPlayerSendLimits(
  sendQueue: readonly UnitId[],
  builderFactionId: RaceId,
  talents: PlayerCreatureTalents = NO_PLAYER_CREATURE_TALENTS,
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
        ...buildUnitTalents(unit, talents),
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

/**
 * Call on change only: after a send, a creature talent purchase, the wave-start
 * reset and a match (re)start.
 */
export function publishPlayerSendLimits(state: DuelMatchState, builderFactionId: RaceId): void {
  publishGameEvent(
    'send-limits-updated',
    buildPlayerSendLimits(state.player.sendQueue, builderFactionId, state.player),
  );
}
