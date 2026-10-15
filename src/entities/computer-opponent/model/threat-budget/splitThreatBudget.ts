import {
  ECONOMY_FLOOR_MIN_LIVES_SHARE,
  MAX_SEND_SHARE,
  SURPLUS_SEND_SHARE_BOOST,
  type ThreatBudgetTuning,
} from './constants';

/** One lane of the next wave against the towers that can shoot it. */
export type DefenceLaneAssessment = {
  /** Armor-adjusted health of the creeps on this lane. */
  incomingHealth: number;
  /** Damage the standing towers deal to them along the lane's route. */
  waveDamage: number;
  /** Lane damage one more gold of towers adds; 0 when nothing can be built. */
  damagePerGold: number;
};

/**
 * Incoming wave against the damage the opponent's towers deal to it. The
 * ground lane is the maze; the air lane, when the wave has fliers, is the
 * straight air route only towers that can shoot air defend.
 */
export type DefenceAssessment = DefenceLaneAssessment & {
  /** The air part of the wave; absent when no air creep is expected. */
  air?: DefenceLaneAssessment;
};

export type ThreatBudgetInput = {
  gold: number;
  assessment: DefenceAssessment;
  tuning: Readonly<ThreatBudgetTuning>;
  /** The difficulty's share of a comfortable purse that may go to sends. */
  maxSendShare: number;
  /** The most the build planner may spend this round (difficulty spend cap). */
  maxBuildBudget: number;
  /** Lives left over starting lives (0..1): how many leaks this side can still afford. */
  livesShare: number;
  /** Price of the cheapest creep this side can send; 0 when it can send none. */
  cheapestSendCost: number;
};

export type ThreatBudgetSplit = {
  /** Wave damage over wave health; Infinity when no wave is coming. */
  margin: number;
  /** 0 at or below the threatened margin, 1 at or above the comfortable one. */
  comfort: number;
  /** Gold of towers it takes to reach the comfortable margin. */
  defenceShortfallGold: number;
  sendBudget: number;
  buildBudget: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function laneMargin(lane: DefenceLaneAssessment): number {
  return lane.incomingHealth > 0 ? lane.waveDamage / lane.incomingHealth : Infinity;
}

/** Gold of towers it takes to lift the lane to `targetMargin`. */
function laneShortfallGold(lane: DefenceLaneAssessment, targetMargin: number): number {
  const missingDamage = Math.max(0, lane.incomingHealth * targetMargin - lane.waveDamage);
  return lane.damagePerGold > 0 ? Math.ceil(missingDamage / lane.damagePerGold) : 0;
}

/** The weaker of the ground and air lanes decides how threatened a side is. */
export function computeDefenceMargin(assessment: DefenceAssessment): number {
  const ground = laneMargin(assessment);
  return assessment.air ? Math.min(ground, laneMargin(assessment.air)) : ground;
}

/** Damage the lane still lacks to reach `targetMargin` over its wave. */
function laneMissingDamage(lane: DefenceLaneAssessment, targetMargin: number): number {
  return Math.max(0, lane.incomingHealth * targetMargin - lane.waveDamage);
}

/**
 * How much of the opponent's next defence spend belongs on the air line
 * (0..1): the air lane's share of the damage both lanes still lack to reach
 * `comfortableMargin`, so a maze that already holds the ground sends every
 * coverage tower to the fliers, and a field short on both splits by need.
 * When neither lane is short, the air part of the wave's health decides, so
 * placements keep valuing both lanes. 0 without an air lane.
 */
export function computeAirThreatShare(
  assessment: DefenceAssessment,
  comfortableMargin: number,
): number {
  if (!assessment.air) {
    return 0;
  }
  const groundMissing = laneMissingDamage(assessment, comfortableMargin);
  const airMissing = laneMissingDamage(assessment.air, comfortableMargin);
  if (groundMissing + airMissing > 0) {
    return airMissing / (groundMissing + airMissing);
  }
  const total = assessment.incomingHealth + assessment.air.incomingHealth;
  return total > 0 ? assessment.air.incomingHealth / total : 0;
}

/**
 * Splits a purse between defence and sends by threat. Defence first claims
 * the gold it needs to reach a comfortable margin over the next wave; sends
 * get what is left, up to the difficulty's share (more when the margin has
 * surplus). The margin is the weaker of the ground and air lanes, so a
 * maze that holds the ground creeps still counts as threatened while
 * fliers cross unanswered. Under threat sends shrink to an income floor (a
 * share that scales with the lives left, and at least one cheap creep while
 * half the lives remain), so a healthy side keeps compounding its income
 * while a dying one puts everything into towers. Building eases off as the margin
 * gets comfortable, so the gold it leaves carries into the next round's
 * sends; under threat it may spend up to the difficulty cap. Pure and
 * deterministic.
 */
export function splitThreatBudget(input: ThreatBudgetInput): ThreatBudgetSplit {
  const { gold, assessment, tuning } = input;
  const purse = Math.max(0, gold);
  const margin = computeDefenceMargin(assessment);
  const comfortRange = Math.max(Number.EPSILON, tuning.comfortableMargin - tuning.threatenedMargin);
  const comfort = clamp((margin - tuning.threatenedMargin) / comfortRange, 0, 1);

  const defenceShortfallGold =
    laneShortfallGold(assessment, tuning.comfortableMargin) +
    (assessment.air ? laneShortfallGold(assessment.air, tuning.comfortableMargin) : 0);

  const surplus = Number.isFinite(margin)
    ? clamp((margin - tuning.comfortableMargin) / tuning.comfortableMargin, 0, 1)
    : 1;
  const livesShare = clamp(input.livesShare, 0, 1);
  const floorScale = tuning.threatenedSendScale * livesShare;
  const economyFloor = livesShare >= ECONOMY_FLOOR_MIN_LIVES_SHARE ? input.cheapestSendCost : 0;
  const floorBudget = Math.min(
    purse,
    Math.max(purse * input.maxSendShare * floorScale, economyFloor),
  );
  const sendShare = Math.min(
    MAX_SEND_SHARE,
    input.maxSendShare *
      (floorScale + (1 - floorScale) * comfort) *
      (1 + SURPLUS_SEND_SHARE_BOOST * surplus),
  );
  const sendBudget = Math.floor(
    Math.max(floorBudget, Math.min(purse * sendShare, purse - defenceShortfallGold)),
  );

  const easedBuildBudget = Math.floor(
    input.maxBuildBudget * (1 - comfort * (1 - tuning.comfortableBuildSpendScale)),
  );
  const buildBudget = Math.max(
    0,
    Math.min(input.maxBuildBudget, Math.max(defenceShortfallGold, easedBuildBudget)),
  );

  return { margin, comfort, defenceShortfallGold, sendBudget, buildBudget };
}
