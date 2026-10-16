import { resolveUnitConfigById } from '../../unit/model/registry';
import {
  applyCreatureGrade,
  chooseCreatureBranch,
  getCreatureGrade,
  upgradeCreature,
  type CreatureBranchRejectionReason,
  type CreatureTalentBranchId,
  type CreatureTalentCheck,
  type CreatureTalentLedger,
  type CreatureUpgradeRejectionReason,
} from '../../unit/model/talents';
import type { UnitConfig, UnitId } from '../../unit/model/types';
import type { DuelistState, DuelMatchState, DuelSide } from './types';

/**
 * Creature talents on a duel side. Experience lives in the match state, so the
 * check and the charge happen together here; a refusal leaves the state as is.
 */

export type DuelCreatureTalentResult<Reason extends string> = {
  state: DuelMatchState;
  check: CreatureTalentCheck<Reason>;
};

function withLedger(
  state: DuelMatchState,
  side: DuelSide,
  ledger: CreatureTalentLedger,
): DuelMatchState {
  return { ...state, [side]: { ...state[side], ...ledger } };
}

/** Picks a creature branch for one side, paying its tier experience. */
export function recordCreatureBranchChoice(
  state: DuelMatchState,
  side: DuelSide,
  unitId: UnitId,
  branchId: CreatureTalentBranchId,
): DuelCreatureTalentResult<CreatureBranchRejectionReason> {
  const result = chooseCreatureBranch(state[side], resolveUnitConfigById(unitId), branchId);
  return {
    state: result.check.allowed ? withLedger(state, side, result.ledger) : state,
    check: result.check,
  };
}

/** Buys one side the next grade of a creature along its chosen branch. */
export function recordCreatureUpgrade(
  state: DuelMatchState,
  side: DuelSide,
  unitId: UnitId,
): DuelCreatureTalentResult<CreatureUpgradeRejectionReason> {
  const result = upgradeCreature(state[side], resolveUnitConfigById(unitId));
  return {
    state: result.check.allowed ? withLedger(state, side, result.ledger) : state,
    check: result.check,
  };
}

/**
 * The creature a side's next send of `unitId` spawns as: at the grade the side
 * owns now. Its abilities decide send-time rules such as `freeNthSend`.
 */
export function resolveNextSendUnit(
  duelist: Pick<DuelistState, 'creatureBranchChoices' | 'creatureGrades'>,
  unitId: UnitId,
): UnitConfig {
  return applyCreatureGrade(
    resolveUnitConfigById(unitId),
    duelist.creatureBranchChoices,
    getCreatureGrade(unitId, duelist.creatureGrades),
  );
}

/**
 * The creatures a side's queued sends spawn as: each at the grade it was sent
 * with (`sendQueueGrades`), along the side's chosen branch. A chosen branch is
 * fixed for the match, so the grade alone pins the stats.
 */
export function resolveQueuedSendUnits(
  duelist: Pick<DuelistState, 'sendQueue' | 'sendQueueGrades' | 'creatureBranchChoices'>,
): UnitConfig[] {
  return duelist.sendQueue.map((unitId, index) =>
    applyCreatureGrade(
      resolveUnitConfigById(unitId),
      duelist.creatureBranchChoices,
      duelist.sendQueueGrades[index] ?? 0,
    ),
  );
}
