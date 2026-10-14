import { UnitMoveType } from '../../../../shared/types/content-ids';
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
  /** The part of `totalHealth` that flies the straight air route over the maze. */
  airHealth: number;
  airCreepCount: number;
  /** Mean speed of the air creeps; the reference speed when none are expected. */
  airAverageSpeed: number;
};

type CreepGroup = {
  health: number;
  count: number;
  speedSum: number;
  airHealth: number;
  airCount: number;
  airSpeedSum: number;
};

const EMPTY_GROUP: CreepGroup = {
  health: 0,
  count: 0,
  speedSum: 0,
  airHealth: 0,
  airCount: 0,
  airSpeedSum: 0,
};

function sumUnits(units: readonly UnitConfig[]): CreepGroup {
  return units.reduce<CreepGroup>((group, unit) => {
    const health = computeEffectiveHealth(unit);
    const flies = unit.moveType === UnitMoveType.AIR;
    return {
      health: group.health + health,
      count: group.count + 1,
      speedSum: group.speedSum + unit.speed,
      airHealth: group.airHealth + (flies ? health : 0),
      airCount: group.airCount + (flies ? 1 : 0),
      airSpeedSum: group.airSpeedSum + (flies ? unit.speed : 0),
    };
  }, EMPTY_GROUP);
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
  const share = count / roster.count;
  return {
    health: roster.health * share,
    count,
    speedSum: roster.speedSum * share,
    airHealth: roster.airHealth * share,
    airCount: roster.airCount * share,
    airSpeedSum: roster.airSpeedSum * share,
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
  const airCreepCount = baseline.airCount + sends.airCount;

  return {
    baselineHealth,
    sendHealth,
    totalHealth: baselineHealth + sendHealth,
    creepCount,
    averageSpeed:
      creepCount > 0 ? (baseline.speedSum + sends.speedSum) / creepCount : REFERENCE_CREEP_SPEED,
    airHealth: (baseline.airHealth + sends.airHealth) * healthMultiplier,
    airCreepCount,
    airAverageSpeed:
      airCreepCount > 0
        ? (baseline.airSpeedSum + sends.airSpeedSum) / airCreepCount
        : REFERENCE_CREEP_SPEED,
  };
}
