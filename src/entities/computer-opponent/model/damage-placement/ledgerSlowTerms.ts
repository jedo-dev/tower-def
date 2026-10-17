import type { UnitMoveType } from '../../../../shared/types/content-ids';
import {
  CREEP_ARRIVALS_PER_SECOND,
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  REFERENCE_CREEP_SPEED,
} from './constants';
import {
  computeGroundZoneChillWindow,
  NO_ZONE_CHILL,
  type ZoneChillWindow,
} from './deferredMechanicsValue';
import type { LedgerTower } from './routeDamageLedger';
import type { RouteGeometry } from './routeGeometry';
import { computeCreepsStruckPerShot } from './shotReach';
import { combineOwnSlowGains, slowTimeGain } from './slowGain';
import { canDamageModelTowerHit, computeChill, computeShotDps } from './towerDamageModel';

const MS_PER_SECOND = 1000;

/** What the slow terms read from a route damage ledger. */
export type LedgerSlowContext = {
  readonly geometry: RouteGeometry;
  readonly moveType: UnitMoveType;
  readonly towers: readonly LedgerTower[];
  /** Every tower's damage rate per route sample, up to date. */
  field(): Float64Array;
};

export type LedgerSlowTerms = {
  /** Share of the wave a tower's on-hit effect reaches. */
  struckShare(tower: LedgerTower, boost: number): number;
  /** What a tower's slows add to the others' damage: the extra time in reach they buy. */
  frostBonus(tower: LedgerTower, excludeIndex: number, boost: number): number;
};

/** Raises `slow` to the window's magnitude over its samples. */
function holdStrongest(
  slow: Float64Array,
  window: { from: number; to: number; magnitude: number },
): void {
  for (let sample = window.from; sample <= window.to; sample += 1) {
    slow[sample] = Math.max(slow[sample], window.magnitude);
  }
}

/**
 * The ledger's slow valuation: on-hit chills over the tower's reach plus the
 * distance a chill lasts, ground zone chills over the zones' footprint
 * (tower-def-02k.13), each on the share of the wave it reaches and over what
 * a stronger slow of another tower already holds there.
 */
export function createLedgerSlowTerms(context: LedgerSlowContext): LedgerSlowTerms {
  const { geometry, moveType, towers } = context;

  /** Strongest slow on every sample, from every frost tower except `excludeIndex`. */
  function slowBySample(excludeIndex: number): Float64Array {
    const slow = new Float64Array(geometry.length);
    towers.forEach((tower, index) => {
      if (index === excludeIndex) {
        return;
      }
      holdStrongest(slow, chillWindow(tower));
      holdStrongest(slow, zoneChillWindow(tower, 1));
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

  /** Samples a tower's ground zones keep chilled, on this lane (`computeGroundZoneChillWindow`). */
  function zoneChillWindow(tower: LedgerTower, boost: number): ZoneChillWindow {
    if (!canDamageModelTowerHit(tower, moveType) || tower.stats.attackCooldownMs <= 0) {
      return NO_ZONE_CHILL;
    }
    return computeGroundZoneChillWindow(
      tower.stats.abilities,
      geometry,
      geometry.coveredSamples(tower.anchor, tower.stats.range),
      (MS_PER_SECOND / tower.stats.attackCooldownMs) * boost,
      moveType,
    );
  }

  /**
   * Share of the wave a tower's on-hit effect reaches: creeps struck per
   * second (every creep a shot strikes, averaged over its reach) against
   * creeps arriving per second, at most all of them.
   */
  function struckShare(tower: LedgerTower, boost: number): number {
    const covered = geometry.coveredSamples(tower.anchor, tower.stats.range);
    let struck = 0;
    for (const sample of covered) {
      struck += computeCreepsStruckPerShot(tower, geometry, sample);
    }
    const perShot = covered.length > 0 ? struck / covered.length : 1;
    const shotsPerSecond = (computeShotDps(tower.stats) / Math.max(1, tower.stats.damage)) * boost;
    return Math.min(1, (shotsPerSecond * perShot) / CREEP_ARRIVALS_PER_SECOND);
  }

  function frostBonus(tower: LedgerTower, excludeIndex: number, boost: number): number {
    const window = chillWindow(tower);
    const zone = zoneChillWindow(tower, boost);
    if (zone.magnitude > 0) {
      return combinedFrostBonus(tower, window, zone, excludeIndex, boost);
    }
    if (window.magnitude <= 0) {
      return 0;
    }
    const field = context.field();
    const slow = slowBySample(excludeIndex);
    const chilledShare = struckShare(tower, boost);
    const gain = slowTimeGain(window.magnitude);
    let bonus = 0;
    for (let sample = window.from; sample <= window.to; sample += 1) {
      bonus += field[sample] * Math.max(0, gain - slowTimeGain(slow[sample]));
    }
    return bonus * chilledShare;
  }

  /**
   * Frost bonus of a tower that also lays chilling ground zones: on each
   * sample, the shot's chill on its struck share and the zone's on its walked
   * share, the stronger one counted where both reach a creep.
   */
  function combinedFrostBonus(
    tower: LedgerTower,
    shot: { from: number; to: number; magnitude: number },
    zone: ZoneChillWindow,
    excludeIndex: number,
    boost: number,
  ): number {
    const field = context.field();
    const slow = slowBySample(excludeIndex);
    const shotShare = shot.magnitude > 0 ? struckShare(tower, boost) : 0;
    const shotGain = slowTimeGain(shot.magnitude);
    const zoneGain = slowTimeGain(zone.magnitude);
    const from = shot.to >= shot.from ? Math.min(shot.from, zone.from) : zone.from;
    const to = Math.max(shot.to, zone.to);
    let bonus = 0;
    for (let sample = from; sample <= to; sample += 1) {
      const existing = slowTimeGain(slow[sample]);
      const inShot = sample >= shot.from && sample <= shot.to;
      const inZone = sample >= zone.from && sample <= zone.to;
      bonus +=
        field[sample] *
        combineOwnSlowGains(
          inShot ? shotShare : 0,
          inShot ? Math.max(0, shotGain - existing) : 0,
          inZone ? zone.share : 0,
          inZone ? Math.max(0, zoneGain - existing) : 0,
        );
    }
    return bonus;
  }

  return { struckShare, frostBonus };
}
