import { UnitMoveType } from '../../../../shared/types/content-ids';
import { calculateAirRoute } from '../../../../shared/lib/pathfinding/airRoute';
import type { DuelMatchState } from '../../../duel-match/model/types';
import { getRaceRegistry } from '../../../race-registry/model/registries';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
import { getRaceTowerTypes } from '../buildSpendBudget';
import {
  canDamageModelTowerHit,
  collectInvestmentTypes,
  createRouteDamageLedger,
  createRouteGeometry,
  computeShotDps,
  toLedgerTowers,
  type InvestmentTowerType,
} from '../damage-placement';
import { createMazeEvaluator } from '../maze-evaluation/createMazeEvaluator';
import { ENEMY_SEND_INCOME_SHARE } from './constants';
import { estimateDefenceCapability, type DefenceWallPrice } from './estimateDefenceCapability';
import { estimateIncomingThreat } from './estimateIncomingThreat';
import type { DefenceAssessment, DefenceLaneAssessment } from './splitThreatBudget';

/** The cheapest buildable type that can shoot `moveType`, priced; null when there is none. */
function findCheapestLaneWall(
  types: readonly InvestmentTowerType[],
  moveType: UnitMoveType,
): DefenceWallPrice | null {
  const wall = types.find((type) => canDamageModelTowerHit(type, moveType));
  return wall ? { cost: wall.cost, shotDps: computeShotDps(wall.stats) } : null;
}

/**
 * The computer opponent's next wave against its defence, read off a match:
 * the shared baseline wave (drawn from the player's roster, as the runtime
 * does) plus the player's sends, against the towers on the opponent's field.
 * Ground creeps are measured along the route its maze makes today; air
 * creeps along the straight air line, against the towers that can hit air.
 */
export function assessDefence(matchState: DuelMatchState): DefenceAssessment {
  const { opponent, player } = matchState;
  const threat = estimateIncomingThreat({
    waveNumber: matchState.round,
    baselineFactionUnits: getUnitsByFaction(player.raceId),
    observedSends: player.sendQueue.map((unitId) => resolveUnitConfigById(unitId)),
    expectedSendGold: player.income * ENEMY_SEND_INCOME_SHARE,
    enemySendables: getRaceRegistry(player.raceId).sendableCreepIds.map((unitId) =>
      resolveUnitConfigById(unitId),
    ),
  });

  const { grid, towers } = opponent.battlefield;
  const { routes } = createMazeEvaluator(grid, grid.entrance, grid.exit);
  const ledgerTowers = toLedgerTowers(towers);
  const types = collectInvestmentTypes(getRaceTowerTypes(opponent.raceId), opponent.raceId);

  const groundCreepCount = threat.creepCount - threat.airCreepCount;
  const ground = estimateDefenceCapability({
    ledger: createRouteDamageLedger(createRouteGeometry(routes.smallRoute), ledgerTowers),
    creepCount: groundCreepCount,
    averageSpeed: threat.averageSpeed,
    wall: findCheapestLaneWall(types, UnitMoveType.GROUND),
  });
  const assessment: DefenceLaneAssessment = {
    incomingHealth: threat.totalHealth - threat.airHealth,
    waveDamage: ground.waveDamage,
    damagePerGold: ground.damagePerGold,
  };

  if (threat.airCreepCount <= 0) {
    return assessment;
  }

  const air = estimateDefenceCapability({
    ledger: createRouteDamageLedger(
      createRouteGeometry(calculateAirRoute(grid.entrance, grid.exit)),
      ledgerTowers,
      UnitMoveType.AIR,
    ),
    creepCount: threat.airCreepCount,
    averageSpeed: threat.airAverageSpeed,
    wall: findCheapestLaneWall(types, UnitMoveType.AIR),
  });

  return {
    ...assessment,
    air: {
      incomingHealth: threat.airHealth,
      waveDamage: air.waveDamage,
      damagePerGold: air.damagePerGold,
    },
  };
}
