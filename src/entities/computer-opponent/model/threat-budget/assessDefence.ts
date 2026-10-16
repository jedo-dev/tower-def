import { UnitMoveType } from '../../../../shared/types/content-ids';
import { calculateAirRoute } from '../../../../shared/lib/pathfinding/airRoute';
import type { DuelMatchState } from '../../../duel-match/model/types';
import { getRaceRegistry } from '../../../race-registry/model/registries';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
import { getRaceTowerTypes } from '../buildSpendBudget';
import {
  canDamageModelTowerHit,
  collectInvestmentTypes,
  computeEffectiveShotDps,
  createRouteDamageLedger,
  createRouteGeometry,
  toLedgerTowers,
  type InvestmentTowerType,
} from '../damage-placement';
import type { DamageTypeEfficiency } from '../damage-profile';
import { createMazeEvaluator } from '../maze-evaluation/createMazeEvaluator';
import { ENEMY_SEND_INCOME_SHARE } from './constants';
import { estimateDefenceCapability, type DefenceWallPrice } from './estimateDefenceCapability';
import { estimateIncomingThreat } from './estimateIncomingThreat';
import type { DefenceAssessment, DefenceLaneAssessment } from './splitThreatBudget';

/**
 * The cheapest buildable type that can shoot `moveType`, priced, its damage
 * counted against the lane's armor; null when there is none.
 */
function findCheapestLaneWall(
  types: readonly InvestmentTowerType[],
  moveType: UnitMoveType,
  efficiency: DamageTypeEfficiency,
): DefenceWallPrice | null {
  const wall = types.find((type) => canDamageModelTowerHit(type, moveType));
  return wall ? { cost: wall.cost, shotDps: computeEffectiveShotDps(wall, efficiency) } : null;
}

/**
 * The computer opponent's next wave against its defence, read off a match:
 * the shared baseline wave (drawn from the match's baseline roster, as the
 * runtime does) plus the player's sends, against the towers on the opponent's
 * field. Ground creeps are measured along the route its maze makes today; air
 * creeps along the straight air line, against the towers that can hit air.
 * Each lane counts tower damage against its own creeps' armor, per damage type.
 */
export function assessDefence(matchState: DuelMatchState): DefenceAssessment {
  const { opponent, player } = matchState;
  const threat = estimateIncomingThreat({
    waveNumber: matchState.round,
    baselineFactionUnits: getUnitsByFaction(matchState.baselineRaceId),
    observedSends: player.sendQueue.map((unitId) => resolveUnitConfigById(unitId)),
    expectedSendGold: player.income * ENEMY_SEND_INCOME_SHARE,
    enemySendables: getRaceRegistry(player.raceId).sendableCreepIds.map((unitId) =>
      resolveUnitConfigById(unitId),
    ),
  });

  const { grid, towers } = opponent.battlefield;
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  const ledgerTowers = toLedgerTowers(towers, opponent.towerBranchChoices);
  const types = collectInvestmentTypes(getRaceTowerTypes(opponent.raceId), opponent.raceId);

  const groundCreepCount = threat.creepCount - threat.airCreepCount;
  const ground = estimateDefenceCapability({
    ledger: createRouteDamageLedger(
      createRouteGeometry(routes.smallRoute),
      ledgerTowers,
      UnitMoveType.GROUND,
      threat.groundEfficiency,
    ),
    creepCount: groundCreepCount,
    averageSpeed: threat.averageSpeed,
    wall: findCheapestLaneWall(types, UnitMoveType.GROUND, threat.groundEfficiency),
  });
  const assessment: DefenceLaneAssessment = {
    incomingHealth: threat.totalHealth - threat.airHealth,
    waveDamage: ground.waveDamage,
    damagePerGold: ground.damagePerGold,
    damageEfficiency: threat.groundEfficiency,
  };

  if (threat.airCreepCount <= 0) {
    return assessment;
  }

  const air = estimateDefenceCapability({
    ledger: createRouteDamageLedger(
      createRouteGeometry(calculateAirRoute(grid.entrance, grid.exit)),
      ledgerTowers,
      UnitMoveType.AIR,
      threat.airEfficiency,
    ),
    creepCount: threat.airCreepCount,
    averageSpeed: threat.airAverageSpeed,
    wall: findCheapestLaneWall(types, UnitMoveType.AIR, threat.airEfficiency),
  });

  return {
    ...assessment,
    air: {
      incomingHealth: threat.airHealth,
      waveDamage: air.waveDamage,
      damagePerGold: air.damagePerGold,
      damageEfficiency: threat.airEfficiency,
    },
  };
}
