import type { GridPoint } from '../../../../shared/types/grid';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  CREEP_ARRIVALS_PER_SECOND,
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  MAX_SLOW_TIME_GAIN,
  REFERENCE_CREEP_SPEED,
} from './constants';
import { NEUTRAL_DAMAGE_EFFICIENCY, type DamageTypeEfficiency } from '../damage-profile';
import type { RouteGeometry } from './routeGeometry';
import { computeDefenceAmplification } from './abilityDamageModel';
import {
  canDamageModelTowerHit,
  computeAura,
  computeAuraBoostFor,
  computeChill,
  computeSampleDamageRate,
  computeShotDps,
  resolveDamageModelDamageType,
  resolveOnHitEffects,
  type DamageModelTower,
} from './towerDamageModel';
import { computeCreepsStruckPerShot } from './shotReach';

const MS_PER_SECOND = 1000;

/** A tower standing (or planned) at a block anchor. */
export type LedgerTower = DamageModelTower & { anchor: GridPoint };

/**
 * Every tower's damage along one route, in damage-samples: damage per second
 * summed over the route samples the tower reaches. Divided by samples walked
 * per second it is the damage one creep takes walking past, so a tower at a
 * turn, which reaches the route twice, is worth twice the same tower on a
 * straight. Frost and support towers are valued by what they add to the
 * others: the slow stretches their time in range, the aura their fire rate.
 * A ledger values one lane: the creeps walking its route move by `moveType`,
 * so a tower whose `allowedTargets` cannot hit them contributes nothing here.
 * Damage is counted in hit points of the lane's expected wave: each tower's
 * raw damage times what its damage type is worth against that wave's armor
 * (`efficiency`), so a magical tower facing plated creeps outvalues the same
 * tower dealing physical damage.
 */
export type RouteDamageLedger = {
  readonly geometry: RouteGeometry;
  /** Move type of the creeps on this lane (ground maze or air line). */
  readonly moveType: UnitMoveType;
  /** What each damage type is worth against the lane's expected wave. */
  readonly efficiency: DamageTypeEfficiency;
  readonly towers: readonly LedgerTower[];
  add(tower: LedgerTower): number;
  replace(index: number, tower: LedgerTower): void;
  /** What `tower` adds given every ledger tower except the one at `excludeIndex`. */
  contributionOf(tower: LedgerTower, excludeIndex?: number): number;
  /** Mean damage per second over the route samples: what one more route cell is worth now. */
  averageSampleDps(): number;
};

const NO_INDEX = -1;

/** Extra time a slowed creep spends in reach, capped at `MAX_SLOW_TIME_GAIN`. */
function slowTimeGain(slow: number): number {
  return slow > 0 ? Math.min(MAX_SLOW_TIME_GAIN, 1 / (1 - slow) - 1) : 0;
}

export function createRouteDamageLedger(
  geometry: RouteGeometry,
  initialTowers: readonly LedgerTower[] = [],
  moveType: UnitMoveType = UnitMoveType.GROUND,
  efficiency: DamageTypeEfficiency = NEUTRAL_DAMAGE_EFFICIENCY,
): RouteDamageLedger {
  const towers: LedgerTower[] = [...initialTowers];
  const field = new Float64Array(geometry.length);
  let isFieldStale = true;

  /** Damage rate on this lane: zero for a tower that cannot shoot its creeps. */
  function sampleRate(tower: LedgerTower, sample: number): number {
    return canDamageModelTowerHit(tower, moveType)
      ? computeSampleDamageRate(tower, geometry, sample, efficiency, moveType)
      : 0;
  }

  function directSamples(tower: LedgerTower): number {
    let total = 0;
    for (const sample of geometry.coveredSamples(tower.anchor, tower.stats.range)) {
      total += sampleRate(tower, sample);
    }
    return total;
  }

  /** Strongest aura on `target`, from every support except `excludeIndex` and `selfIndex`. */
  function auraBoostAt(target: LedgerTower, excludeIndex: number, selfIndex: number): number {
    let boost = 0;
    towers.forEach((support, index) => {
      if (index === excludeIndex || index === selfIndex) {
        return;
      }
      const radius = computeAura(support).radius;
      const distance = Math.hypot(
        support.anchor.x - target.anchor.x,
        support.anchor.y - target.anchor.y,
      );
      const bonus = distance <= radius ? computeAuraBoostFor(support, target) : 0;
      if (bonus > boost) {
        boost = bonus;
      }
    });
    return boost;
  }

  function refreshField(): void {
    if (!isFieldStale) {
      return;
    }
    field.fill(0);
    towers.forEach((tower, index) => {
      const boost = 1 + auraBoostAt(tower, NO_INDEX, index);
      for (const sample of geometry.coveredSamples(tower.anchor, tower.stats.range)) {
        field[sample] += sampleRate(tower, sample) * boost;
      }
    });
    isFieldStale = false;
  }

  /** Strongest slow on every sample, from every frost tower except `excludeIndex`. */
  function slowBySample(excludeIndex: number): Float64Array {
    const slow = new Float64Array(geometry.length);
    towers.forEach((tower, index) => {
      if (index === excludeIndex) {
        return;
      }
      const window = chillWindow(tower);
      for (let sample = window.from; sample <= window.to; sample += 1) {
        slow[sample] = Math.max(slow[sample], window.magnitude);
      }
    });
    return slow;
  }

  /** Samples a frost tower keeps chilled: its reach plus the distance a chill lasts. */
  function chillWindow(tower: LedgerTower): { from: number; to: number; magnitude: number } {
    const chill = computeChill(tower);
    const covered = geometry.coveredSamples(tower.anchor, tower.stats.range);
    if (chill.magnitude <= 0 || covered.length === 0 || !canDamageModelTowerHit(tower, moveType)) {
      return { from: 0, to: -1, magnitude: 0 };
    }
    const chilledSpeed =
      CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED * REFERENCE_CREEP_SPEED * (1 - chill.magnitude);
    const tail = Math.ceil((chill.durationMs / MS_PER_SECOND) * chilledSpeed);
    const to = Math.min(geometry.length - 1, covered[covered.length - 1] + tail);
    return { from: covered[0], to, magnitude: chill.magnitude };
  }

  /**
   * Share of the wave a tower's on-hit effect reaches at least once: creeps
   * struck per second (every creep a shot strikes, averaged over its reach)
   * spread over the creeps arriving per second, `1 - e^(-struck / arrivals)`,
   * since strikes fall again on creeps already struck.
   */
  function struckShare(tower: LedgerTower, boost: number): number {
    const covered = geometry.coveredSamples(tower.anchor, tower.stats.range);
    let struck = 0;
    for (const sample of covered) {
      struck += computeCreepsStruckPerShot(tower, geometry, sample);
    }
    const perShot = covered.length > 0 ? struck / covered.length : 1;
    const shotsPerSecond = (computeShotDps(tower.stats) / Math.max(1, tower.stats.damage)) * boost;
    return 1 - Math.exp((-shotsPerSecond * perShot) / CREEP_ARRIVALS_PER_SECOND);
  }

  function frostBonus(tower: LedgerTower, excludeIndex: number, boost: number): number {
    const window = chillWindow(tower);
    if (window.magnitude <= 0) {
      return 0;
    }
    refreshField();
    const slow = slowBySample(excludeIndex);
    const chilledShare = struckShare(tower, boost);
    const gain = slowTimeGain(window.magnitude);
    let bonus = 0;
    for (let sample = window.from; sample <= window.to; sample += 1) {
      bonus += field[sample] * Math.max(0, gain - slowTimeGain(slow[sample]));
    }
    return bonus * chilledShare;
  }

  function supportBonus(tower: LedgerTower, excludeIndex: number): number {
    const aura = computeAura(tower);
    if (aura.radius <= 0) {
      return 0;
    }
    let bonus = 0;
    towers.forEach((neighbour, index) => {
      const distance = Math.hypot(
        neighbour.anchor.x - tower.anchor.x,
        neighbour.anchor.y - tower.anchor.y,
      );
      if (index === excludeIndex || distance > aura.radius) {
        return;
      }
      const offered = computeAuraBoostFor(tower, neighbour);
      const current = auraBoostAt(neighbour, excludeIndex, index);
      bonus += Math.max(0, offered - current) * directSamples(neighbour);
    });
    return bonus;
  }

  /** Samples a tower's hits stay amplified: its reach plus how far creeps walk meanwhile. */
  function amplifyWindow(tower: LedgerTower): { from: number; to: number; gain: number } {
    const amplification = computeDefenceAmplification(
      resolveOnHitEffects(tower),
      resolveDamageModelDamageType(tower),
      tower.stats.attackCooldownMs,
      efficiency,
    );
    const covered = geometry.coveredSamples(tower.anchor, tower.stats.range);
    if (
      amplification.fieldGain <= 0 ||
      covered.length === 0 ||
      !canDamageModelTowerHit(tower, moveType)
    ) {
      return { from: 0, to: -1, gain: 0 };
    }
    const speed = CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED * REFERENCE_CREEP_SPEED;
    const tail = Math.ceil((amplification.durationMs / MS_PER_SECOND) * speed);
    const to = Math.min(geometry.length - 1, covered[covered.length - 1] + tail);
    return { from: covered[0], to, gain: amplification.fieldGain };
  }

  /**
   * Vulnerability and armor break: the tower's own damage on the creeps it
   * marks, plus the share of the others' damage on the samples it keeps
   * marked, over what a stronger mark of another tower already adds there.
   */
  function amplifyBonus(tower: LedgerTower, excludeIndex: number, boost: number): number {
    const own = computeDefenceAmplification(
      resolveOnHitEffects(tower),
      resolveDamageModelDamageType(tower),
      tower.stats.attackCooldownMs,
      efficiency,
    ).ownGain;
    const ownBonus = own > 0 ? directSamples(tower) * boost * own : 0;
    const window = amplifyWindow(tower);
    if (window.gain <= 0) {
      return ownBonus;
    }
    refreshField();
    const existing = new Float64Array(geometry.length);
    towers.forEach((other, index) => {
      if (index === excludeIndex) {
        return;
      }
      const otherWindow = amplifyWindow(other);
      for (let sample = otherWindow.from; sample <= otherWindow.to; sample += 1) {
        existing[sample] = Math.max(existing[sample], otherWindow.gain);
      }
    });
    const markedShare = struckShare(tower, boost);
    let bonus = 0;
    for (let sample = window.from; sample <= window.to; sample += 1) {
      bonus += field[sample] * Math.max(0, window.gain - existing[sample]);
    }
    return ownBonus + bonus * markedShare;
  }

  return {
    geometry,
    moveType,
    efficiency,
    towers,
    add(tower: LedgerTower): number {
      towers.push(tower);
      isFieldStale = true;
      return towers.length - 1;
    },
    replace(index: number, tower: LedgerTower): void {
      towers[index] = tower;
      isFieldStale = true;
    },
    contributionOf(tower: LedgerTower, excludeIndex: number = NO_INDEX): number {
      const boost = 1 + auraBoostAt(tower, excludeIndex, NO_INDEX);
      return (
        directSamples(tower) * boost +
        frostBonus(tower, excludeIndex, boost) +
        amplifyBonus(tower, excludeIndex, boost) +
        supportBonus(tower, excludeIndex)
      );
    },
    averageSampleDps(): number {
      refreshField();
      let total = 0;
      for (const value of field) {
        total += value;
      }
      return geometry.length > 0 ? total / geometry.length : 0;
    },
  };
}
