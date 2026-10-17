import { DAMAGE_TYPES, DamageType, UnitMoveType } from '../../../../shared/types/content-ids';
import { calculateAirRoute } from '../../../../shared/lib/pathfinding/airRoute';
import type { GridModel } from '../../../../shared/types/grid';
import {
  canDamageModelTowerHit,
  computeSampleDamageRate,
  createRouteDamageLedger,
  createRouteGeometry,
  type LedgerTower,
  type RouteGeometry,
} from '../damage-placement';
import {
  normalizeDamageMix,
  type DamageTypeEfficiency,
  type DamageTypeMix,
} from '../damage-profile';
import { createMazeEvaluator } from '../maze-evaluation/createMazeEvaluator';
import { estimateDefenceCapability } from '../threat-budget/estimateDefenceCapability';
import type { IncomingThreat } from '../threat-budget/estimateIncomingThreat';

/**
 * One lane of the defender's field as a sender reads it. Only towers whose
 * `allowedTargets` (per level and grade) can hit the lane's creeps count, with
 * their target multipliers on it (the archer air bonuses on the air line) and
 * their damage against the lane's expected armor.
 */
export type LaneDefence = {
  /** Damage the lane's towers deal to its expected creeps as they pass (`estimateDefenceCapability`). */
  waveDamage: number;
  /** Hit points of the defender's next wave on this lane, before our sends still to buy. */
  incomingHealth: number;
  /** Damage types of the lane's fire; even when the lane takes none. */
  damageMix: DamageTypeMix;
};

/**
 * The defender's two lanes (the maze its ground creeps walk today and the
 * straight air line), plus the hit points of one more send, mean creep of the
 * wave: what each lane must also absorb for a send to be stopped.
 */
export type DefenderLaneProfile = Readonly<Record<UnitMoveType, LaneDefence>> & {
  marginalSendHealth: number;
};

/** One damage type at full worth, the others at none: a sample rate split by type. */
const ONLY_DAMAGE_TYPE: Readonly<Record<DamageType, DamageTypeEfficiency>> = {
  [DamageType.PHYSICAL]: { physical: 1, magical: 0, percent: 0 },
  [DamageType.MAGICAL]: { physical: 0, magical: 1, percent: 0 },
  [DamageType.PERCENT]: { physical: 0, magical: 0, percent: 1 },
};

/**
 * Damage types of the fire one lane takes, direct damage only: a sender only
 * needs to know which armor the towers that reach its creeps go through.
 */
export function computeLaneDamageMix(
  geometry: RouteGeometry,
  towers: readonly LedgerTower[],
  moveType: UnitMoveType,
): DamageTypeMix {
  const byType: Record<DamageType, number> = {
    [DamageType.PHYSICAL]: 0,
    [DamageType.MAGICAL]: 0,
    [DamageType.PERCENT]: 0,
  };
  for (const tower of towers) {
    if (!canDamageModelTowerHit(tower, moveType)) {
      continue;
    }
    for (const sample of geometry.coveredSamples(tower.anchor, tower.stats.range)) {
      for (const damageType of DAMAGE_TYPES) {
        byType[damageType] += computeSampleDamageRate(
          tower,
          geometry,
          sample,
          ONLY_DAMAGE_TYPE[damageType],
          moveType,
        );
      }
    }
  }
  return normalizeDamageMix(byType);
}

type LaneInput = {
  geometry: RouteGeometry;
  towers: readonly LedgerTower[];
  moveType: UnitMoveType;
  efficiency: DamageTypeEfficiency;
  incomingHealth: number;
  creepCount: number;
  averageSpeed: number;
};

function readLane(input: LaneInput): LaneDefence {
  const ledger = createRouteDamageLedger(
    input.geometry,
    input.towers,
    input.moveType,
    input.efficiency,
  );
  const { waveDamage } = estimateDefenceCapability({
    ledger,
    creepCount: Math.max(1, input.creepCount),
    averageSpeed: input.averageSpeed,
    wall: null,
  });
  return {
    waveDamage,
    incomingHealth: input.incomingHealth,
    damageMix: computeLaneDamageMix(input.geometry, input.towers, input.moveType),
  };
}

/**
 * The defender's field read lane by lane against its next wave (`threat`:
 * the shared baseline plus what we already queued): ground creeps along the
 * route its maze makes today, fliers along the straight air line, each lane
 * against the towers that can shoot it. The wave is split by its expected
 * flier share of hit points, not by its one typical draw, which often holds
 * no flier at all.
 */
export function computeDefenderLaneProfile(
  grid: GridModel,
  towers: readonly LedgerTower[],
  threat: IncomingThreat,
): DefenderLaneProfile {
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  const airShare = threat.expectedAirHealthShare;
  return {
    [UnitMoveType.GROUND]: readLane({
      geometry: createRouteGeometry(routes.smallRoute),
      towers,
      moveType: UnitMoveType.GROUND,
      efficiency: threat.groundEfficiency,
      incomingHealth: threat.totalHealth * (1 - airShare),
      creepCount: threat.creepCount * (1 - airShare),
      averageSpeed: threat.averageSpeed,
    }),
    [UnitMoveType.AIR]: readLane({
      geometry: createRouteGeometry(calculateAirRoute(grid.entrance, grid.exit)),
      towers,
      moveType: UnitMoveType.AIR,
      efficiency: threat.airEfficiency,
      incomingHealth: threat.totalHealth * airShare,
      creepCount: threat.creepCount * airShare,
      averageSpeed: threat.airAverageSpeed,
    }),
    marginalSendHealth: threat.creepCount > 0 ? threat.totalHealth / threat.creepCount : 0,
  };
}
