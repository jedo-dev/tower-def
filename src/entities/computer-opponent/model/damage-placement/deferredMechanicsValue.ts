import type { TowerAbilities } from '../../../tower/model/abilities';
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
} as const;

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
