import {
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  WAVE_SPAWN_INTERVAL_SECONDS,
} from '../damage-placement/constants';
import type { RouteDamageLedger } from '../damage-placement/routeDamageLedger';
import { DEFAULT_NEW_TOWER_COVERED_SAMPLES } from './constants';

/** The cheapest tower the opponent can add, to price a top-up of its defence. */
export type DefenceWallPrice = {
  cost: number;
  shotDps: number;
};

export type DefenceCapabilityInput = {
  /** Standing towers on the route creeps walk today. */
  ledger: RouteDamageLedger;
  creepCount: number;
  /** Mean creep speed of the wave, in speed points. */
  averageSpeed: number;
  /** Null when the opponent cannot build anything. */
  wall: DefenceWallPrice | null;
};

export type DefenceCapability = {
  /** Damage the towers deal to the whole wave as it walks the route. */
  waveDamage: number;
  /** Wave damage one more gold of towers is expected to add; 0 when it cannot build. */
  damagePerGold: number;
};

const MIN_SAMPLES_PER_SECOND = 1e-6;

/**
 * Damage one tower deals to a wave. Each creep spends `covered / speed`
 * seconds in range and takes `contribution / speed` damage on the way; the
 * tower keeps firing while any creep is in range, so the wave gets at most
 * one full pass per creep, and fewer once the wave is longer than the
 * stretch the tower reaches (it cannot shoot two creeps at once).
 */
function waveDamageOfTower(
  contribution: number,
  coveredSamples: number,
  samplesPerSecond: number,
  creepCount: number,
): number {
  if (contribution <= 0 || creepCount <= 0) {
    return 0;
  }
  const secondsInRange = Math.max(1, coveredSamples) / samplesPerSecond;
  const waveSpanSeconds = Math.max(0, creepCount - 1) * WAVE_SPAWN_INTERVAL_SECONDS;
  const passes = Math.min(creepCount, (waveSpanSeconds + secondsInRange) / secondsInRange);
  return (contribution / samplesPerSecond) * passes;
}

/**
 * How much of the next wave the opponent's towers can stop: the sum over
 * towers of damage per second times the time creeps spend in their range
 * (covered route samples over creep speed), plus what one more gold of
 * towers would add, so a shortfall can be priced in gold.
 */
export function estimateDefenceCapability(input: DefenceCapabilityInput): DefenceCapability {
  const { ledger, creepCount } = input;
  const samplesPerSecond = Math.max(
    MIN_SAMPLES_PER_SECOND,
    input.averageSpeed * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  );

  let waveDamage = 0;
  ledger.towers.forEach((tower, index) => {
    const covered = ledger.geometry.coveredSamples(tower.anchor, tower.stats.range).length;
    const contribution = ledger.contributionOf(tower, index);
    waveDamage += waveDamageOfTower(contribution, covered, samplesPerSecond, creepCount);
  });

  if (!input.wall || input.wall.cost <= 0) {
    return { waveDamage, damagePerGold: 0 };
  }
  const newTowerDamage = waveDamageOfTower(
    input.wall.shotDps * DEFAULT_NEW_TOWER_COVERED_SAMPLES,
    DEFAULT_NEW_TOWER_COVERED_SAMPLES,
    samplesPerSecond,
    creepCount,
  );
  const meanTowerDamage = ledger.towers.length > 0 ? waveDamage / ledger.towers.length : 0;
  return { waveDamage, damagePerGold: Math.max(newTowerDamage, meanTowerDamage) / input.wall.cost };
}
