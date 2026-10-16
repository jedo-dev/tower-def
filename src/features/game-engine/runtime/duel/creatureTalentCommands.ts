import {
  recordCreatureBranchChoice,
  recordCreatureUpgrade,
  type DuelMatchState,
} from '../../../../entities/duel-match';
import { getRaceRegistry } from '../../../../entities/race-registry';
import type { UnitId } from '../../../../entities/unit';
import type { RaceId } from '../../../../shared/types/content-ids';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import { publishPlayerSendLimits } from './gameSceneSendLimits';

export type CreatureTalentCommandDeps = {
  getDuelMatchState: () => DuelMatchState;
  setDuelMatchState: (state: DuelMatchState) => void;
  isMatchOver: () => boolean;
  getBuilderFactionId: () => RaceId;
  playSound: (soundId: SoundId) => void;
  onHudChanged: () => void;
};

/** The player's own sendable creature with this id; talents develop sends only. */
function findSendableUnitId(deps: CreatureTalentCommandDeps, unitId: string): UnitId | undefined {
  return getRaceRegistry(deps.getBuilderFactionId()).sendableCreepIds.find(
    (candidate) => candidate === unitId,
  );
}

function applyAccepted(deps: CreatureTalentCommandDeps, nextState: DuelMatchState): void {
  deps.setDuelMatchState(nextState);
  deps.playSound('economy.gold_spent');
  deps.onHudChanged();
  // The send panel shows the branches and grade per creature.
  publishPlayerSendLimits(nextState, deps.getBuilderFactionId());
}

/**
 * `choose-creature-branch`: picks a talent branch for one of the player's
 * sendable creatures, at any phase of a running match. It costs experience of
 * the creature's tier and locks the other branch for the match. A refused pick
 * only plays the error sound.
 */
export function handleChooseCreatureBranchCommand(
  deps: CreatureTalentCommandDeps,
  unitId: string,
  branchId: string,
): void {
  const sendableUnitId = findSendableUnitId(deps, unitId);
  if (deps.isMatchOver() || sendableUnitId === undefined) {
    deps.playSound('ui.error');
    return;
  }

  const result = recordCreatureBranchChoice(
    deps.getDuelMatchState(),
    'player',
    sendableUnitId,
    branchId,
  );
  if (!result.check.allowed) {
    deps.playSound('ui.error');
    return;
  }
  applyAccepted(deps, result.state);
}

/**
 * `upgrade-creature`: buys the next grade (up to 4) along the creature's
 * chosen branch for experience of its tier. It applies to the creatures of
 * that type sent afterwards; queued and walking ones keep their grade.
 */
export function handleUpgradeCreatureCommand(
  deps: CreatureTalentCommandDeps,
  unitId: string,
): void {
  const sendableUnitId = findSendableUnitId(deps, unitId);
  if (deps.isMatchOver() || sendableUnitId === undefined) {
    deps.playSound('ui.error');
    return;
  }

  const result = recordCreatureUpgrade(deps.getDuelMatchState(), 'player', sendableUnitId);
  if (!result.check.allowed) {
    deps.playSound('ui.error');
    return;
  }
  applyAccepted(deps, result.state);
}
