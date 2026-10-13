import { getSendCostByTier } from '../../../duel-match/model/sendEconomy';
import type { UnitConfig } from '../../../unit/model/types';
import { generateWaveUnits } from '../../../wave/model/generateWaveUnits';
import { getWaveHealthMultiplier } from '../../../wave/model/waveHealth';
import { REFERENCE_CREEP_SPEED } from '../damage-placement/constants';
import { BASELINE_ESTIMATE_RANDOM_ROLL } from './constants';
import { computeEffectiveHealth } from './effectiveHealth';

export type IncomingThreatInput = {
  waveNumber: number;
  /** Roster the shared baseline wave is drawn from. */
  baselineFactionUnits: readonly UnitConfig[];
  /** Creeps the other duelist has already queued against this side. */
  observedSends: readonly UnitConfig[];
  /** Gold the other duelist is expected to put into sends this wave. */
  expectedSendGold: number;
  /** What the other duelist can send, to turn expected gold into creeps. */
  enemySendables: readonly UnitConfig[];
};

/** The next wave on this side's field, armor-adjusted. */
export type IncomingThreat = {
  baselineHealth: number;
  sendHealth: number;
  /** Armor-adjusted health of the whole wave: the damage it takes to stop it. */
  totalHealth: number;
  creepCount: number;
  /** Mean creep speed over the wave, in speed points. */
  averageSpeed: number;
};

type CreepGroup = { health: number; count: number; speedSum: number };

const EMPTY_GROUP: CreepGroup = { health: 0, count: 0, speedSum: 0 };

function sumUnits(units: readonly UnitConfig[]): CreepGroup {
  return units.reduce<CreepGroup>(
    (group, unit) => ({
      health: group.health + computeEffectiveHealth(unit),
      count: group.count + 1,
      speedSum: group.speedSum + unit.speed,
    }),
    EMPTY_GROUP,
  );
}

/** Creeps `gold` buys from `sendables` at their average price, health and speed. */
function estimateSends(gold: number, sendables: readonly UnitConfig[]): CreepGroup {
  if (gold <= 0 || sendables.length === 0) {
    return EMPTY_GROUP;
  }
  const roster = sumUnits(sendables);
  const averageCost =
    sendables.reduce((sum, unit) => sum + getSendCostByTier(unit.tier), 0) / sendables.length;
  const count = gold / averageCost;
  return {
    health: (roster.health / roster.count) * count,
    count,
    speedSum: (roster.speedSum / roster.count) * count,
  };
}

/**
 * Expected next wave on this side: the shared baseline wave (its typical
 * draw) plus the other duelist's sends. A queue it has already filled is
 * taken as it is; an empty or small one is topped up to what its income
 * suggests, so the estimate never assumes a quiet round it cannot know about.
 */
export function estimateIncomingThreat(input: IncomingThreatInput): IncomingThreat {
  const baseline = sumUnits(
    generateWaveUnits({
      waveNumber: input.waveNumber,
      factionUnits: [...input.baselineFactionUnits],
      random: () => BASELINE_ESTIMATE_RANDOM_ROLL,
    }),
  );
  const observed = sumUnits(input.observedSends);
  const estimated = estimateSends(input.expectedSendGold, input.enemySendables);
  const sends = observed.health >= estimated.health ? observed : estimated;
  const creepCount = baseline.count + sends.count;
  // Every creep of the wave spawns with its health grown to the wave number.
  const healthMultiplier = getWaveHealthMultiplier(input.waveNumber);
  const baselineHealth = baseline.health * healthMultiplier;
  const sendHealth = sends.health * healthMultiplier;

  return {
    baselineHealth,
    sendHealth,
    totalHealth: baselineHealth + sendHealth,
    creepCount,
    averageSpeed:
      creepCount > 0 ? (baseline.speedSum + sends.speedSum) / creepCount : REFERENCE_CREEP_SPEED,
  };
}
