import type { RaceId } from '../../../shared/types/content-ids';
import type { UnitId, UnitTier } from '../../unit/model/types';
import { getSendCostByTier, getIncomeBonusByTier } from '../../duel-match/model/sendEconomy';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { resolveUnitConfigById } from '../../unit/model/registry';
import { Difficulty } from '../../difficulty/model/types';
import type { DecisionContext, SendCreepAction } from './types';
import { StrategyIntent } from './types';
import { createSendDecisionOutput } from './decisionDebugSnapshots';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';

export type SendPlannerInput = {
  context: DecisionContext;
  debugRecorder?: ComputerDecisionDebugRecorder;
};

export type SendPlannerOutput = {
  actions: readonly SendCreepAction[];
  totalCost: number;
  totalIncomeBonus: number;
  reasoning: string;
};

type SendBudgetConfig = {
  maxSendRatioPerRound: number;
};

const SEND_BUDGET_BY_DIFFICULTY: Record<Difficulty, SendBudgetConfig> = {
  [Difficulty.EASY]: { maxSendRatioPerRound: 0.2 },
  [Difficulty.NORMAL]: { maxSendRatioPerRound: 0.35 },
  [Difficulty.HARD]: { maxSendRatioPerRound: 0.5 },
  [Difficulty.NIGHTMARE]: { maxSendRatioPerRound: 0.7 },
};

function computeSendBudget(gold: number, difficulty: Difficulty): number {
  const config = SEND_BUDGET_BY_DIFFICULTY[difficulty];
  return Math.floor(gold * config.maxSendRatioPerRound);
}

function getSendableUnitsForRace(raceId: RaceId): UnitId[] {
  const registry = getRaceRegistry(raceId);
  return [...registry.sendableCreepIds];
}

function sortByTierDesc(units: UnitId[]): Array<{ id: UnitId; tier: UnitTier; cost: number }> {
  const withConfig = units.map((id) => {
    const config = resolveUnitConfigById(id);
    return {
      id,
      tier: config.tier,
      cost: getSendCostByTier(config.tier),
    };
  });

  return withConfig.sort((a, b) => b.tier - a.tier);
}

function shouldSendCreeps(context: DecisionContext): boolean {
  if (context.phase !== 'build') {
    return false;
  }

  if (context.threat.threatLevel === 'high') {
    return false;
  }

  return true;
}

function selectCreepsToSend(
  context: DecisionContext,
  budget: number,
): Array<{ id: UnitId; tier: UnitTier; cost: number }> {
  const sendableUnits = getSendableUnitsForRace(context.raceId);
  const sortedUnits = sortByTierDesc(sendableUnits);

  const selected: Array<{ id: UnitId; tier: UnitTier; cost: number }> = [];
  let remainingBudget = budget;

  for (const unit of sortedUnits) {
    if (unit.cost > remainingBudget) {
      continue;
    }

    const maxCount = Math.min(
      Math.floor(remainingBudget / unit.cost),
      3,
    );

    for (let i = 0; i < maxCount; i++) {
      selected.push(unit);
      remainingBudget -= unit.cost;
    }

    if (remainingBudget <= 0) {
      break;
    }
  }

  return selected;
}

export function planSendCreeps(input: SendPlannerInput): SendPlannerOutput {
  const { context, debugRecorder } = input;

  function finish(output: SendPlannerOutput): SendPlannerOutput {
    debugRecorder?.recordSendDecision(context, createSendDecisionOutput(context, output));
    return output;
  }

  if (!shouldSendCreeps(context)) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning: context.phase !== 'build'
        ? 'Not in build phase, cannot send creeps'
        : 'High threat detected, saving gold for defense',
    });
  }

  const budget = computeSendBudget(context.gold, context.difficulty);

  if (budget <= 0) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning: 'No budget available for sending creeps',
    });
  }

  const selectedCreeps = selectCreepsToSend(context, budget);

  if (selectedCreeps.length === 0) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning: 'No affordable creeps available for sending',
    });
  }

  const actions: SendCreepAction[] = [];
  let totalCost = 0;
  let totalIncomeBonus = 0;

  for (const creep of selectedCreeps) {
    actions.push({ kind: 'send_creep', creepTypeId: creep.id });
    totalCost += creep.cost;
    totalIncomeBonus += getIncomeBonusByTier(creep.tier);
  }

  const intentLabel = context.intent === StrategyIntent.PRESSURE ? 'pressure' : 'economy';

  return finish({
    actions,
    totalCost,
    totalIncomeBonus,
    reasoning: `Sending ${actions.length} creeps for ${intentLabel} (${totalCost} gold, +${totalIncomeBonus} income)`,
  });
}
