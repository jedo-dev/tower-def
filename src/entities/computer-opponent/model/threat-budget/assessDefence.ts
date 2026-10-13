import type { DuelMatchState } from '../../../duel-match/model/types';
import { getRaceRegistry } from '../../../race-registry/model/registries';
import { getUnitsByFaction, resolveUnitConfigById } from '../../../unit/model/registry';
import { getRaceTowerTypes } from '../buildSpendBudget';
import {
  collectInvestmentTypes,
  createRouteDamageLedger,
  createRouteGeometry,
  computeShotDps,
  toLedgerTowers,
} from '../damage-placement';
import { createMazeEvaluator } from '../maze-evaluation/createMazeEvaluator';
import { ENEMY_SEND_INCOME_SHARE } from './constants';
import { estimateDefenceCapability } from './estimateDefenceCapability';
import { estimateIncomingThreat } from './estimateIncomingThreat';
import type { DefenceAssessment } from './splitThreatBudget';

/**
 * The computer opponent's next wave against its defence, read off a match:
 * the shared baseline wave (drawn from the player's roster, as the runtime
 * does) plus the player's sends, against the towers on the opponent's field
 * along the route its creeps walk today.
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
  const ledger = createRouteDamageLedger(
    createRouteGeometry(routes.smallRoute),
    toLedgerTowers(towers),
  );
  const [wall] = collectInvestmentTypes(getRaceTowerTypes(opponent.raceId), opponent.raceId);
  const capability = estimateDefenceCapability({
    ledger,
    creepCount: threat.creepCount,
    averageSpeed: threat.averageSpeed,
    wall: wall ? { cost: wall.cost, shotDps: computeShotDps(wall.stats) } : null,
  });

  return {
    incomingHealth: threat.totalHealth,
    waveDamage: capability.waveDamage,
    damagePerGold: capability.damagePerGold,
  };
}
