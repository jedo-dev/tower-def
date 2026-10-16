import { sendCreep } from '../../duel-match/model/lifecycle';
import type { DuelMatchState } from '../../duel-match/model/types';
import {
  recordCreatureBranchChoice,
  recordCreatureUpgrade,
  resolveNextSendUnit,
} from '../../duel-match/model/creatureTalents';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';
import { planSendCreeps, type SendPlannerOutput } from './planSendCreeps';
import type { DecisionContext } from './types';

export type ApplyComputerSendStrategyInput = {
  state: DuelMatchState;
  context: DecisionContext;
  debugRecorder?: ComputerDecisionDebugRecorder;
};

export type ApplyComputerSendStrategyResult = {
  state: DuelMatchState;
  decision: SendPlannerOutput;
  sentCount: number;
  spentGold: number;
  incomeGained: number;
  /** Creature talent steps (branch picks and grades) the rules accepted. */
  developedCount: number;
};

export function applyComputerSendStrategy(
  input: ApplyComputerSendStrategyInput,
): ApplyComputerSendStrategyResult {
  const decision = planSendCreeps({
    context: input.context,
    debugRecorder: input.debugRecorder,
  });
  let state = input.state;
  let sentCount = 0;
  let spentGold = 0;
  let incomeGained = 0;
  let developedCount = 0;

  // Creature talents first: a send spawns at the grade it was queued with.
  for (const action of decision.developmentActions) {
    const result =
      action.kind === 'choose_creature_branch'
        ? recordCreatureBranchChoice(state, 'opponent', action.unitId, action.branchId)
        : recordCreatureUpgrade(state, 'opponent', action.unitId);
    state = result.state;
    developedCount += result.check.allowed ? 1 : 0;
  }

  for (const action of decision.actions) {
    // At the computer's current creature grade.
    const unitConfig = resolveNextSendUnit(state.opponent, action.creepTypeId);
    const result = sendCreep(state, false, action.creepTypeId, unitConfig.tier, {
      freeNthSend: unitConfig.abilities?.freeNthSend,
    });

    state = result.state;

    if (result.sent) {
      sentCount += 1;
      spentGold += result.cost;
      incomeGained += result.incomeBonus;
    }
  }

  return {
    state,
    decision,
    sentCount,
    spentGold,
    incomeGained,
    developedCount,
  };
}
