import {
  ECONOMY_FLOOR_MIN_LIVES_SHARE,
  MAX_SEND_SHARE,
  SURPLUS_SEND_SHARE_BOOST,
  type ThreatBudgetTuning,
} from './constants';

/** Incoming wave against the damage the opponent's towers deal to it. */
export type DefenceAssessment = {
  /** Armor-adjusted health of the expected next wave. */
  incomingHealth: number;
  /** Damage the standing towers deal to that wave. */
  waveDamage: number;
  /** Wave damage one more gold of towers adds; 0 when nothing can be built. */
  damagePerGold: number;
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

/**
 * Splits a purse between defence and sends by threat. Defence first claims
 * the gold it needs to reach a comfortable margin over the next wave; sends
 * get what is left, up to the difficulty's share (more when the margin has
 * surplus). Under threat sends shrink to an income floor (a share that
 * scales with the lives left, and at least one cheap creep while half the
 * lives remain), so a healthy side keeps compounding its income while a
 * dying one puts everything into towers. Building eases off as the margin
 * gets comfortable, so the gold it leaves carries into the next round's
 * sends; under threat it may spend up to the difficulty cap. Pure and
 * deterministic.
 */
export function splitThreatBudget(input: ThreatBudgetInput): ThreatBudgetSplit {
  const { gold, assessment, tuning } = input;
  const purse = Math.max(0, gold);
  const margin =
    assessment.incomingHealth > 0 ? assessment.waveDamage / assessment.incomingHealth : Infinity;
  const comfortRange = Math.max(Number.EPSILON, tuning.comfortableMargin - tuning.threatenedMargin);
  const comfort = clamp((margin - tuning.threatenedMargin) / comfortRange, 0, 1);

  const missingDamage = Math.max(
    0,
    assessment.incomingHealth * tuning.comfortableMargin - assessment.waveDamage,
  );
  const defenceShortfallGold =
    assessment.damagePerGold > 0 ? Math.ceil(missingDamage / assessment.damagePerGold) : 0;

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
