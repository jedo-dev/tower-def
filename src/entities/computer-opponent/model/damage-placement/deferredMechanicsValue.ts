import { UnitMoveType } from '../../../../shared/types/content-ids';
import type { TowerAbilities } from '../../../tower/model/abilities';
import { NEUTRAL_DAMAGE_EFFICIENCY, type DamageTypeEfficiency } from '../damage-profile';
import {
  CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED,
  REFERENCE_CREEP_SPEED,
  WAVE_SPAWN_INTERVAL_SECONDS,
} from './constants';
import { expectedCreepsAround } from './routeDensity';
import type { RouteGeometry } from './routeGeometry';

/**
 * Conservative valuation of the deferred talent mechanics (tower-def-bge.9):
 * minimal terms so the computer does not read a restored branch as a pure
 * number loss. Kept apart from `abilityDamageModel.ts`; each term is an
 * expectation over the route samples, never a roll.
 */
export const DEFERRED_MECHANICS_VALUATION = {
  /** Degrees of a full turn: a cone covers `coneDegrees / 360` of the creeps around. */
  fullTurnDegrees: 360,
  /** Share of a corpse explosion's ideal worth counted: overkill and spread-out kills. */
  corpseExplosionRealism: 0.5,
  /** Most creeps one corpse explosion is expected to reach. */
  maxCorpseExplosionTargets: 4,
  /** Share of a ground zone's ticks a creep inside is expected to sit through. */
  groundZoneRealism: 0.5,
  /** Most creeps one ground zone is expected to hold at once. */
  maxGroundZoneTargets: 4,
} as const;

const MS_PER_SECOND = 1000;

/**
 * Extra creeps (in shares of a full hit) a cone shot at `sampleIndex` also
 * damages: the cone's share of a full turn of the creeps within range. Packs
 * line up along the route, so this undercounts a cone aimed down a lane.
 */
export function computeConeExtraHitShare(
  abilities: TowerAbilities | undefined,
  range: number,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const coneDegrees = abilities?.coneDegrees;
  if (coneDegrees === undefined || coneDegrees <= 0) {
    return 0;
  }
  const others = Math.max(0, expectedCreepsAround(geometry, sampleIndex, range) - 1);
  return (others * coneDegrees) / DEFERRED_MECHANICS_VALUATION.fullTurnDegrees;
}

/**
 * Extra damage a corpse explosion adds per point of shot damage. A kill
 * explodes for `share * maxHp`, and the shot's damage turns into kills at
 * `damage / maxHp`, so the health cancels: each point of damage is worth
 * `share` more on every other creep in the radius. Halved for overkill and
 * capped; chains are not counted.
 */
export function computeCorpseExplosionFactor(
  abilities: TowerAbilities | undefined,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const share = abilities?.corpseExplosionShare;
  const radius = abilities?.corpseExplosionRadiusCells;
  if (share === undefined || radius === undefined || share <= 0) {
    return 0;
  }
  const others = Math.min(
    DEFERRED_MECHANICS_VALUATION.maxCorpseExplosionTargets,
    Math.max(0, expectedCreepsAround(geometry, sampleIndex, radius) - 1),
  );
  return share * others * DEFERRED_MECHANICS_VALUATION.corpseExplosionRealism;
}

/**
 * Damage per second a ground zone adds at `sampleIndex` on the ground lane,
 * in hit points of the wave `efficiency` describes: one zone's tick rate on
 * the creeps the route packs inside it, halved because creeps walk through
 * rather than stand. Overlapping zones are not counted; the zone's chill is
 * valued by the ledger (`computeGroundZoneChillWindow`).
 */
export function computeGroundZoneDps(
  abilities: TowerAbilities | undefined,
  geometry: RouteGeometry,
  sampleIndex: number,
  efficiency: DamageTypeEfficiency = NEUTRAL_DAMAGE_EFFICIENCY,
  moveType: UnitMoveType = UnitMoveType.GROUND,
): number {
  const zone = abilities?.groundZone;
  if (zone === undefined || zone.damage <= 0 || moveType !== UnitMoveType.GROUND) {
    return 0;
  }
  const creeps = Math.min(
    DEFERRED_MECHANICS_VALUATION.maxGroundZoneTargets,
    expectedCreepsAround(geometry, sampleIndex, zone.radiusCells),
  );
  return (
    ((zone.damage * MS_PER_SECOND) / zone.tickMs) *
    creeps *
    DEFERRED_MECHANICS_VALUATION.groundZoneRealism *
    efficiency[zone.damageType]
  );
}

/**
 * Route samples a tower's ground zones keep chilled, the zone's slow, and the
 * share of the wave that walks through a live zone there (tower-def-02k.13).
 */
export type ZoneChillWindow = {
  readonly from: number;
  readonly to: number;
  readonly magnitude: number;
  readonly share: number;
};

export const NO_ZONE_CHILL: ZoneChillWindow = { from: 0, to: -1, magnitude: 0, share: 0 };

/**
 * Route samples one creep spacing covers: the stream's gap between two
 * creeps, the distance a tower's lead target walks before the next one leads.
 */
const CREEP_SPACING_SAMPLES =
  WAVE_SPAWN_INTERVAL_SECONDS * CREEP_CELLS_PER_SECOND_AT_UNIT_SPEED * REFERENCE_CREEP_SPEED;

/**
 * Where and on what share of the wave a ground zone's chill holds. Zones land
 * at the target's feet and towers shoot the creep nearest its exit, so while
 * a wave streams past they land in the last creep spacing of the reach
 * (`covered`), and the footprint is that band widened by the zone's radius.
 * A zone chills every tick for `durationMs / tickMs` ticks, and the tower
 * lays one per shot, so `shotsPerSecond` times that time zones lie at once,
 * each over the route samples within its radius of the landing point (more
 * at a turn). Their route coverage of the footprint, at most 1, is the share
 * of the creeps walking there that walk through a live zone: the zone's
 * counterpart of the struck share of an on-hit chill.
 */
export function computeGroundZoneChillWindow(
  abilities: TowerAbilities | undefined,
  geometry: RouteGeometry,
  covered: readonly number[],
  shotsPerSecond: number,
  moveType: UnitMoveType = UnitMoveType.GROUND,
): ZoneChillWindow {
  const zone = abilities?.groundZone;
  const chill = zone?.chill ?? 0;
  if (
    zone === undefined ||
    chill <= 0 ||
    moveType !== UnitMoveType.GROUND ||
    covered.length === 0 ||
    shotsPerSecond <= 0
  ) {
    return NO_ZONE_CHILL;
  }
  const last = covered[covered.length - 1];
  const footprints = geometry.neighbourCounts(zone.radiusCells);
  let firstLanding = last;
  let footprint = 0;
  let landings = 0;
  for (const sample of covered) {
    if (sample >= last - CREEP_SPACING_SAMPLES) {
      firstLanding = Math.min(firstLanding, sample);
      footprint += footprints[sample];
      landings += 1;
    }
  }
  const radiusSamples = Math.ceil(zone.radiusCells);
  const from = Math.max(0, firstLanding - radiusSamples);
  const to = Math.min(geometry.length - 1, last + radiusSamples);
  const chilledMs = Math.floor(zone.durationMs / zone.tickMs) * zone.tickMs;
  const zonesAlive = (chilledMs / MS_PER_SECOND) * shotsPerSecond;
  const share = Math.min(1, (zonesAlive * (footprint / landings)) / (to - from + 1));
  return { from, to, magnitude: chill, share };
}
