import { TowerAttackKind } from '../../../../shared/types/content-ids';
import type { TowerChainDefinition } from '../../../tower/model/content/loadTowerContent';
import { getTowerArchetype } from '../../../tower/model/types';
import { computeExtraCreepsStruck, computeExtraHitShare } from './abilityDamageModel';
import { MAX_EXPECTED_SPLASH_TARGETS } from './constants';
import { computeConeExtraHitShare } from './deferredMechanicsValue';
import { expectedCreepsAround } from './routeDensity';
import type { RouteGeometry } from './routeGeometry';
import type { DamageModelTower } from './towerDamageModel';

// How many creeps one shot reaches on the route: weighted by the damage share
// each takes (`computeTargetsPerShot`) or counted whole, for the on-hit effects
// every struck creep takes in full (`computeCreepsStruckPerShot`).

/** Chance (0..1) the chain's `bounce`-th arc finds a creep within a jump of the target. */
function chainBounceReach(
  chain: TowerChainDefinition,
  geometry: RouteGeometry,
  sampleIndex: number,
  bounce: number,
): number {
  const available = expectedCreepsAround(geometry, sampleIndex, chain.bounceRangeCells);
  return Math.min(1, Math.max(0, available - bounce));
}

/** Creeps one shot is expected to damage when its target stands at `sampleIndex`. */
export function computeTargetsPerShot(
  tower: DamageModelTower,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const archetype = getTowerArchetype(tower.towerType);

  if (archetype.attackKind === TowerAttackKind.SPLASH) {
    const radius = tower.stats.splashRadius ?? archetype.splashRadius ?? 0;
    return Math.min(
      MAX_EXPECTED_SPLASH_TARGETS,
      expectedCreepsAround(geometry, sampleIndex, radius),
    );
  }

  const chain = tower.stats.chain ?? archetype.chain;
  if (archetype.attackKind === TowerAttackKind.CHAIN && chain) {
    let targets = 1;
    let arcShare = 1;
    for (let bounce = 1; bounce <= chain.bounces; bounce += 1) {
      arcShare *= 1 - chain.damageFalloff;
      targets += chainBounceReach(chain, geometry, sampleIndex, bounce) * arcShare;
    }
    return targets;
  }

  const { abilities, range } = tower.stats;
  return (
    1 +
    computeExtraHitShare(abilities, range, geometry, sampleIndex) +
    computeConeExtraHitShare(abilities, range, geometry, sampleIndex)
  );
}

/**
 * Creeps one shot strikes when its target stands at `sampleIndex`, each
 * counted whole: they all take the shot's on-hit effects in full, whatever
 * share of the damage reaches them (the splash, every chain arc, the extra
 * targets and the pierced creeps).
 */
export function computeCreepsStruckPerShot(
  tower: DamageModelTower,
  geometry: RouteGeometry,
  sampleIndex: number,
): number {
  const archetype = getTowerArchetype(tower.towerType);
  if (archetype.attackKind === TowerAttackKind.SPLASH) {
    return computeTargetsPerShot(tower, geometry, sampleIndex);
  }
  const chain = tower.stats.chain ?? archetype.chain;
  if (archetype.attackKind === TowerAttackKind.CHAIN && chain) {
    let struck = 1;
    for (let bounce = 1; bounce <= chain.bounces; bounce += 1) {
      struck += chainBounceReach(chain, geometry, sampleIndex, bounce);
    }
    return struck;
  }
  // Cone hits land at full damage, so the cone's share is also whole creeps struck.
  const { abilities, range } = tower.stats;
  return (
    1 +
    computeExtraCreepsStruck(abilities, range, geometry, sampleIndex) +
    computeConeExtraHitShare(abilities, range, geometry, sampleIndex)
  );
}
