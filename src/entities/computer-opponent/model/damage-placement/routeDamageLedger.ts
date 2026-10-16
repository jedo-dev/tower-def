import type { GridPoint } from '../../../../shared/types/grid';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  CREEP_ARRIVALS_PER_SECOND,
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  REFERENCE_CREEP_SPEED,
} from './constants';
import { NEUTRAL_DAMAGE_EFFICIENCY, type DamageTypeEfficiency } from '../damage-profile';
import type { RouteGeometry } from './routeGeometry';
import {
  canDamageModelTowerHit,
  computeAura,
  computeChill,
  computeSampleDamageRate,
  computeShotDps,
  type DamageModelTower,
} from './towerDamageModel';

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

function slowTimeGain(slow: number): number {
  return slow > 0 ? 1 / (1 - slow) - 1 : 0;
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
      ? computeSampleDamageRate(tower, geometry, sample, efficiency)
      : 0;
  }

  function directSamples(tower: LedgerTower): number {
    let total = 0;
    for (const sample of geometry.coveredSamples(tower.anchor, tower.stats.range)) {
      total += sampleRate(tower, sample);
    }
    return total;
  }

  /** Strongest aura on `anchor`, from every support except `excludeIndex` and `selfIndex`. */
  function auraBoostAt(anchor: GridPoint, excludeIndex: number, selfIndex: number): number {
    let boost = 0;
    towers.forEach((support, index) => {
      if (index === excludeIndex || index === selfIndex) {
        return;
      }
      const aura = computeAura(support);
      const distance = Math.hypot(support.anchor.x - anchor.x, support.anchor.y - anchor.y);
      if (aura.bonus > boost && distance <= aura.radius) {
        boost = aura.bonus;
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
      const boost = 1 + auraBoostAt(tower.anchor, NO_INDEX, index);
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

  function frostBonus(tower: LedgerTower, excludeIndex: number, boost: number): number {
    const window = chillWindow(tower);
    if (window.magnitude <= 0) {
      return 0;
    }
    refreshField();
    const slow = slowBySample(excludeIndex);
    const shotsPerSecond = (computeShotDps(tower.stats) / Math.max(1, tower.stats.damage)) * boost;
    const chilledShare = Math.min(1, shotsPerSecond / CREEP_ARRIVALS_PER_SECOND);
    const gain = slowTimeGain(window.magnitude);
    let bonus = 0;
    for (let sample = window.from; sample <= window.to; sample += 1) {
      bonus += field[sample] * Math.max(0, gain - slowTimeGain(slow[sample]));
    }
    return bonus * chilledShare;
  }

  function supportBonus(tower: LedgerTower, excludeIndex: number): number {
    const aura = computeAura(tower);
    if (aura.bonus <= 0) {
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
      const current = auraBoostAt(neighbour.anchor, excludeIndex, index);
      bonus += Math.max(0, aura.bonus - current) * directSamples(neighbour);
    });
    return bonus;
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
      const boost = 1 + auraBoostAt(tower.anchor, excludeIndex, NO_INDEX);
      return (
        directSamples(tower) * boost +
        frostBonus(tower, excludeIndex, boost) +
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
