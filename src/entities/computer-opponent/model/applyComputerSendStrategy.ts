import { sendCreep } from '../../duel-match/model/lifecycle';
import type { DuelMatchState } from '../../duel-match/model/types';
import { resolveUnitConfigById } from '../../unit/model/registry';
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

  for (const action of decision.actions) {
    const unitConfig = resolveUnitConfigById(action.creepTypeId);
    const result = sendCreep(state, false, action.creepTypeId, unitConfig.tier);

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
  };
}
