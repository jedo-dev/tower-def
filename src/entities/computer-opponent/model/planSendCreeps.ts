import type { RaceId } from '../../../shared/types/content-ids';
import { DAMAGE_MITIGATION } from '../../../shared/constants/damage';
import type { UnitConfig, UnitId, UnitTier } from '../../unit/model/types';
import { getSendCostByTier, getIncomeBonusByTier } from '../../duel-match/model/sendEconomy';
import { getRaceRegistry } from '../../race-registry/model/registries';
import { resolveUnitConfigById } from '../../unit/model/registry';
import { Difficulty } from '../../difficulty/model/types';
import type { DecisionContext, SendCreepAction } from './types';
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

type SendTuning = {
  maxSendRatioPerRound: number;
  /** Cap on creeps per round, so a gold pile does not turn into a single flood. */
  maxSendsPerRound: number;
  /** Opening rounds spent entirely on income, before any pressure. */
  economyRounds: number;
  /** Share of the budget that goes to pressure once the opening is over. */
  basePressureWeight: number;
};

const SEND_TUNING_BY_DIFFICULTY: Record<Difficulty, SendTuning> = {
  [Difficulty.EASY]: {
    maxSendRatioPerRound: 0.2,
    maxSendsPerRound: 3,
    economyRounds: 5,
    basePressureWeight: 0.2,
  },
  [Difficulty.NORMAL]: {
    maxSendRatioPerRound: 0.35,
    maxSendsPerRound: 5,
    economyRounds: 4,
    basePressureWeight: 0.4,
  },
  [Difficulty.HARD]: {
    maxSendRatioPerRound: 0.5,
    maxSendsPerRound: 7,
    economyRounds: 3,
    basePressureWeight: 0.6,
  },
  [Difficulty.NIGHTMARE]: {
    maxSendRatioPerRound: 0.7,
    maxSendsPerRound: 9,
    economyRounds: 2,
    basePressureWeight: 0.8,
  },
};

/** Extra pressure share per round once the economy opening is over. */
const PRESSURE_RAMP_PER_ROUND = 0.05;
const MAX_PRESSURE_RAMP = 0.3;
/** HP at which the opponent stops investing in income it will never collect. */
const DESPERATE_HP = 5;
const DESPERATE_PRESSURE_BOOST = 0.35;
/** How far an income lead or deficit can shift the split either way. */
const INCOME_LEAD_BIAS_LIMIT = 0.2;

type SendCandidate = {
  id: UnitId;
  tier: UnitTier;
  cost: number;
  incomeBonus: number;
  /** Income per gold spent: what an economy buy maximises. */
  incomeEfficiency: number;
  /** Armor-adjusted health per gold spent: what a pressure buy maximises. */
  pressureEfficiency: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Health scaled by what armor is worth against the mitigation curve the combat
 * model actually uses, so the opponent values a tanky creep the same way the
 * battlefield will.
 */
function computeEffectiveHealth(unit: UnitConfig): number {
  const armorFactor = Math.max(0, unit.armor) * DAMAGE_MITIGATION.armorDamageReductionPerPoint;
  return unit.health * (1 + armorFactor);
}

function createSendCandidates(raceId: RaceId): SendCandidate[] {
  const registry = getRaceRegistry(raceId);

  return registry.sendableCreepIds.map((id) => {
    const config = resolveUnitConfigById(id);
    const cost = getSendCostByTier(config.tier);
    const incomeBonus = getIncomeBonusByTier(config.tier);

    return {
      id,
      tier: config.tier,
      cost,
      incomeBonus,
      incomeEfficiency: incomeBonus / cost,
      pressureEfficiency: computeEffectiveHealth(config) / cost,
    };
  });
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

function computeSendBudget(gold: number, difficulty: Difficulty): number {
  return Math.floor(gold * SEND_TUNING_BY_DIFFICULTY[difficulty].maxSendRatioPerRound);
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
};

/** Buys the best-ranked affordable creep until the purse or the cap runs out. */
function spendOn(
  ranked: readonly SendCandidate[],
  budget: number,
  state: SelectionState,
): number {
  let remaining = budget;

  for (const candidate of ranked) {
    // Keep buying the top pick; a cheaper one only gets a turn once this one no
    // longer fits, which keeps the split honest about what it can afford.
    while (candidate.cost <= remaining && state.remainingSends > 0) {
      state.selected.push(candidate);
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
  const candidates = createSendCandidates(context.raceId);
  if (candidates.length === 0) {
    return { selected: [], pressureWeight: 0 };
  }

  const pressureWeight = computePressureWeight(context, tuning);
  const pressureBudget = Math.floor(budget * pressureWeight);
  const economyBudget = budget - pressureBudget;

  const state: SelectionState = { selected: [], remainingSends: tuning.maxSendsPerRound };

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

  const tuning = SEND_TUNING_BY_DIFFICULTY[context.difficulty];
  const budget = computeSendBudget(context.gold, context.difficulty);

  if (budget <= 0) {
    return finish({
      actions: [],
      totalCost: 0,
      totalIncomeBonus: 0,
      reasoning: 'No budget available for sending creeps',
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
    reasoning: `Sending ${actions.length} creeps at ${pressurePercent}% pressure split (${totalCost} gold, +${totalIncomeBonus} income)`,
  });
}
