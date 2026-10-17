import type { UnitId } from '../../unit/model/types';
import {
  countRemainingSendsOfUnit,
  countRemainingWaveSends,
} from '../../duel-match/model/sendLimits';
import type { DecisionContext, SendCreepAction } from './types';
import { createSendDecisionOutput } from './decisionDebugSnapshots';
import { createSendCandidates, type SendCandidate } from './sendCandidates';
import { createContextSendValuation } from './contextSendValuation';
import { SEND_TUNING_BY_DIFFICULTY, type SendTuning } from './sendTuning';
import { computeContextThreatSplit } from './contextThreatSplit';
import { planContextDevelopment, type CreatureDevelopmentAction } from './creature-development';
import type { ThreatBudgetSplit } from './threat-budget/splitThreatBudget';
import type { ComputerDecisionDebugRecorder } from './decisionDebugSnapshots';

export type SendPlannerInput = {
  context: DecisionContext;
  debugRecorder?: ComputerDecisionDebugRecorder;
};

export type SendPlannerOutput = {
  /**
   * Creature talents bought this build phase (tower-def-716.5), to apply
   * before the sends so they spawn at the new grades.
   */
  developmentActions: readonly CreatureDevelopmentAction[];
  actions: readonly SendCreepAction[];
  totalCost: number;
  totalIncomeBonus: number;
  reasoning: string;
};

/** Extra pressure share per round once the economy opening is over. */
const PRESSURE_RAMP_PER_ROUND = 0.05;
const MAX_PRESSURE_RAMP = 0.3;
/** HP at which the opponent stops investing in income it will never collect. */
const DESPERATE_HP = 5;
const DESPERATE_PRESSURE_BOOST = 0.35;
/** How far an income lead or deficit can shift the split either way. */
const INCOME_LEAD_BIAS_LIMIT = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministic ordering: the goal being bought for, then the other goal as a
 * tie-break, then tier and id. Two creeps of the same tier cost the same and
 * grant the same income, so without the second score the opponent would pick
 * between them alphabetically and leave the tougher one on the shelf.
 */
function rankCandidates(
  candidates: readonly SendCandidate[],
  primaryScoreOf: (candidate: SendCandidate) => number,
  secondaryScoreOf: (candidate: SendCandidate) => number,
): SendCandidate[] {
  return [...candidates].sort((left, right) => {
    const primaryDelta = primaryScoreOf(right) - primaryScoreOf(left);
    if (primaryDelta !== 0) {
      return primaryDelta;
    }

    const secondaryDelta = secondaryScoreOf(right) - secondaryScoreOf(left);
    if (secondaryDelta !== 0) {
      return secondaryDelta;
    }

    if (right.tier !== left.tier) {
      return right.tier - left.tier;
    }

    return left.id.localeCompare(right.id);
  });
}

/**
 * Share of the send budget aimed at breaking the enemy rather than at income.
 *
 * Income compounds, so the opening is pure economy; from there the split walks
 * towards pressure as the match ages, swings on who is ahead on income, and
 * goes all-in once the opponent is too low on HP for an investment to pay back.
 */
function computePressureWeight(context: DecisionContext, tuning: SendTuning): number {
  if (context.round <= tuning.economyRounds) {
    return 0;
  }

  const ramp = Math.min(
    MAX_PRESSURE_RAMP,
    (context.round - tuning.economyRounds) * PRESSURE_RAMP_PER_ROUND,
  );

  const enemyIncome = context.enemy?.income ?? context.income;
  const incomeLeadBias = clamp(
    (context.income - enemyIncome) / Math.max(1, enemyIncome),
    -INCOME_LEAD_BIAS_LIMIT,
    INCOME_LEAD_BIAS_LIMIT,
  );

  const desperationBoost = context.hp <= DESPERATE_HP ? DESPERATE_PRESSURE_BOOST : 0;

  return clamp(tuning.basePressureWeight + ramp + incomeLeadBias + desperationBoost, 0, 1);
}

function computeSendBudget(context: DecisionContext, split: ThreatBudgetSplit | null): number {
  if (split) {
    return split.sendBudget;
  }
  return Math.floor(
    context.gold * SEND_TUNING_BY_DIFFICULTY[context.difficulty].maxSendRatioPerRound,
  );
}

function describeMargin(split: ThreatBudgetSplit | null): string {
  if (!split) {
    return '';
  }
  const margin = Number.isFinite(split.margin) ? split.margin.toFixed(2) : 'unthreatened';
  return `, defence margin ${margin}`;
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

type SelectionState = {
  selected: SendCandidate[];
  remainingSends: number;
  /** Already queued plus selected so far, for the shared per-type limit. */
  queued: UnitId[];
};

/** Buys the best-ranked affordable creep until the purse or the cap runs out. */
function spendOn(ranked: readonly SendCandidate[], budget: number, state: SelectionState): number {
  let remaining = budget;

  for (const candidate of ranked) {
    // Keep buying the top pick; a cheaper one only gets a turn once this one no
    // longer fits, which keeps the split honest about what it can afford.
    while (
      candidate.cost <= remaining &&
      state.remainingSends > 0 &&
      countRemainingSendsOfUnit(state.queued, candidate.id, candidate.tier) > 0
    ) {
      state.selected.push(candidate);
      state.queued.push(candidate.id);
      state.remainingSends -= 1;
      remaining -= candidate.cost;
    }

    if (state.remainingSends <= 0) {
      break;
    }
  }

  return remaining;
}

function selectCreepsToSend(
  context: DecisionContext,
  budget: number,
  tuning: SendTuning,
): { selected: SendCandidate[]; pressureWeight: number } {
  // Our creeps are valued against the damage types the defender's towers deal.
  const candidates = createSendCandidates(
    context.raceId,
    createContextSendValuation(context, tuning),
  );
  if (candidates.length === 0) {
    return { selected: [], pressureWeight: 0 };
  }

  const pressureWeight = computePressureWeight(context, tuning);
  const pressureBudget = Math.floor(budget * pressureWeight);
  const economyBudget = budget - pressureBudget;

  const queued = [...(context.queuedSends ?? [])];
  const state: SelectionState = {
    selected: [],
    remainingSends: Math.min(tuning.maxSendsPerRound, countRemainingWaveSends(queued)),
    queued,
  };

  // Pressure first: the tanky creeps are the expensive ones, and leftovers from
  // that half still buy income creeps, while the reverse rarely fits.
  const pressureLeftover = spendOn(
    rankCandidates(
      candidates,
      (candidate) => candidate.pressureEfficiency,
      (candidate) => candidate.incomeEfficiency,
    ),
    pressureBudget,
    state,
  );
  spendOn(
    rankCandidates(
      candidates,
      (candidate) => candidate.incomeEfficiency,
      (candidate) => candidate.pressureEfficiency,
    ),
    economyBudget + pressureLeftover,
    state,
  );

  return { selected: state.selected, pressureWeight };
}

export function planSendCreeps(input: SendPlannerInput): SendPlannerOutput {
  const { context, debugRecorder } = input;

  function finish(sends: Omit<SendPlannerOutput, 'developmentActions'>): SendPlannerOutput {
    const plannedSends = [
      ...(context.queuedSends ?? []),
      ...sends.actions.map((action) => action.creepTypeId),
    ];
    const development = planContextDevelopment(context, plannedSends);
    const output = { ...sends, developmentActions: development.actions };
    debugRecorder?.recordSendDecision(context, createSendDecisionOutput(context, output));
    return output;
  }

  if (!shouldSendCreeps(context)) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning:
        context.phase !== 'build'
          ? 'Not in build phase, cannot send creeps'
          : 'High threat detected, saving gold for defense',
    });
  }

  const tuning = SEND_TUNING_BY_DIFFICULTY[context.difficulty];
  const split = computeContextThreatSplit(context);
  const budget = computeSendBudget(context, split);

  if (budget <= 0) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning: split
        ? `Defence needs ${split.defenceShortfallGold} gold${describeMargin(split)}, no gold for sends`
        : 'No budget available for sending creeps',
    });
  }

  const { selected, pressureWeight } = selectCreepsToSend(context, budget, tuning);

  if (selected.length === 0) {
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

  for (const creep of selected) {
    actions.push({ kind: 'send_creep', creepTypeId: creep.id });
    totalCost += creep.cost;
    totalIncomeBonus += creep.incomeBonus;
  }

  const pressurePercent = Math.round(pressureWeight * 100);

  return finish({
    actions,
    totalCost,
    totalIncomeBonus,
    reasoning: `Sending ${actions.length} creeps at ${pressurePercent}% pressure split (${totalCost} gold, +${totalIncomeBonus} income${describeMargin(split)})`,
  });
}
