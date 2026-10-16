import { UnitMoveType } from '../../../../shared/types/content-ids';
import { getSendCostByTier } from '../../../duel-match/model/sendEconomy';
import type { UnitConfig } from '../../../unit/model/types';
import { generateWaveUnits } from '../../../wave/model/generateWaveUnits';
import { getWaveHealthMultiplier } from '../../../wave/model/waveHealth';
import { REFERENCE_CREEP_SPEED } from '../damage-placement/constants';
import {
  addArmorTallies,
  EMPTY_ARMOR_TALLY,
  scaleArmorTally,
  tallyCreature,
  toDamageTypeEfficiency,
  type ArmorTally,
  type DamageTypeEfficiency,
} from '../damage-profile';
import { BASELINE_ESTIMATE_RANDOM_ROLL } from './constants';

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

/**
 * The next wave on this side's field. Health is plain hit points, grown to
 * the wave number; armor lives in the per-lane damage efficiency, which a
 * tower's raw damage is multiplied by to land in those hit points.
 */
export type IncomingThreat = {
  baselineHealth: number;
  sendHealth: number;
  /** Hit points of the whole wave. */
  totalHealth: number;
  creepCount: number;
  /** Mean creep speed over the wave, in speed points. */
  averageSpeed: number;
  /** The part of `totalHealth` that flies the straight air route over the maze. */
  airHealth: number;
  airCreepCount: number;
  /** Mean speed of the air creeps; the reference speed when none are expected. */
  airAverageSpeed: number;
  /** What each damage type is worth against the ground creeps of the wave. */
  groundEfficiency: DamageTypeEfficiency;
  /** What each damage type is worth against the fliers; neutral when none are expected. */
  airEfficiency: DamageTypeEfficiency;
};

type CreepGroup = {
  count: number;
  speedSum: number;
  airCount: number;
  airSpeedSum: number;
  ground: ArmorTally;
  air: ArmorTally;
};

const EMPTY_GROUP: CreepGroup = {
  count: 0,
  speedSum: 0,
  airCount: 0,
  airSpeedSum: 0,
  ground: EMPTY_ARMOR_TALLY,
  air: EMPTY_ARMOR_TALLY,
};

/** The units as they spawn in a wave whose health multiplier is `healthMultiplier`. */
function sumUnits(units: readonly UnitConfig[], healthMultiplier: number): CreepGroup {
  return units.reduce<CreepGroup>((group, unit) => {
    const tally = tallyCreature({
      health: unit.health * healthMultiplier,
      physicalArmor: unit.physicalArmor,
      magicalArmor: unit.magicalArmor,
    });
    const flies = unit.moveType === UnitMoveType.AIR;
    return {
      count: group.count + 1,
      speedSum: group.speedSum + unit.speed,
      airCount: group.airCount + (flies ? 1 : 0),
      airSpeedSum: group.airSpeedSum + (flies ? unit.speed : 0),
      ground: flies ? group.ground : addArmorTallies(group.ground, tally),
      air: flies ? addArmorTallies(group.air, tally) : group.air,
    };
  }, EMPTY_GROUP);
}

function groupHealth(group: CreepGroup): number {
  return group.ground.health + group.air.health;
}

/** Creeps `gold` buys from `sendables` at their average price, health and speed. */
function estimateSends(
  gold: number,
  sendables: readonly UnitConfig[],
  healthMultiplier: number,
): CreepGroup {
  if (gold <= 0 || sendables.length === 0) {
    return EMPTY_GROUP;
  }
  const roster = sumUnits(sendables, healthMultiplier);
  const averageCost =
    sendables.reduce((sum, unit) => sum + getSendCostByTier(unit.tier), 0) / sendables.length;
  const count = gold / averageCost;
  const share = count / roster.count;
  return {
    count,
    speedSum: roster.speedSum * share,
    airCount: roster.airCount * share,
    airSpeedSum: roster.airSpeedSum * share,
    ground: scaleArmorTally(roster.ground, share),
    air: scaleArmorTally(roster.air, share),
  };
}

/**
 * Expected next wave on this side: the shared baseline wave (its typical
 * draw) plus the other duelist's sends. A queue it has already filled is
 * taken as it is; an empty or small one is topped up to what its income
 * suggests, so the estimate never assumes a quiet round it cannot know about.
 * Every creep is tallied at the health it spawns with (grown to the wave
 * number), so percent damage is valued against its real maximum health.
 */
export function estimateIncomingThreat(input: IncomingThreatInput): IncomingThreat {
  const healthMultiplier = getWaveHealthMultiplier(input.waveNumber);
  const baseline = sumUnits(
    generateWaveUnits({
      waveNumber: input.waveNumber,
      factionUnits: [...input.baselineFactionUnits],
      random: () => BASELINE_ESTIMATE_RANDOM_ROLL,
    }),
    healthMultiplier,
  );
  const observed = sumUnits(input.observedSends, healthMultiplier);
  const estimated = estimateSends(input.expectedSendGold, input.enemySendables, healthMultiplier);
  const sends = groupHealth(observed) >= groupHealth(estimated) ? observed : estimated;
  const creepCount = baseline.count + sends.count;
  const baselineHealth = groupHealth(baseline);
  const sendHealth = groupHealth(sends);
  const airCreepCount = baseline.airCount + sends.airCount;
  const air = addArmorTallies(baseline.air, sends.air);

  return {
    baselineHealth,
    sendHealth,
    totalHealth: baselineHealth + sendHealth,
    creepCount,
    averageSpeed:
      creepCount > 0 ? (baseline.speedSum + sends.speedSum) / creepCount : REFERENCE_CREEP_SPEED,
    airHealth: air.health,
    airCreepCount,
    airAverageSpeed:
      airCreepCount > 0
        ? (baseline.airSpeedSum + sends.airSpeedSum) / airCreepCount
        : REFERENCE_CREEP_SPEED,
    groundEfficiency: toDamageTypeEfficiency(addArmorTallies(baseline.ground, sends.ground)),
    airEfficiency: toDamageTypeEfficiency(air),
  };
}
