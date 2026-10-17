import { UnitMoveType } from '../../../shared/types/content-ids';
import { getWaveHealthMultiplier } from '../../wave/model/waveHealth';
import { AirCoverageReading, computeAirSurvivalFactor } from './air-coverage';
import { EVEN_DAMAGE_MIX } from './damage-profile';
import type { SendValuation } from './sendCandidates';
import type { SendTuning } from './sendTuning';
import type { DecisionContext } from './types';

/**
 * How the sends are valued against the defender: its damage types, and from
 * the coarse air reading up its air coverage; the full reading also values
 * each lane's creeps against that lane's own damage types.
 */
export function createContextSendValuation(
  context: DecisionContext,
  tuning: SendTuning,
): SendValuation {
  const lanes = context.enemyLanes;
  const airSurvivalFactor = computeAirSurvivalFactor(lanes, tuning.airCoverage);
  const readsLaneMix = lanes !== undefined && tuning.airCoverage === AirCoverageReading.FULL;
  return {
    defenderDamageMix: context.enemyDamageMix ?? EVEN_DAMAGE_MIX,
    healthMultiplier: getWaveHealthMultiplier(context.round),
    ...(context.creatureTalents === undefined ? {} : { creatureTalents: context.creatureTalents }),
    ...(airSurvivalFactor === 1 ? {} : { airSurvivalFactor }),
    ...(readsLaneMix
      ? {
          laneDamageMix: {
            [UnitMoveType.GROUND]: lanes[UnitMoveType.GROUND].damageMix,
            [UnitMoveType.AIR]: lanes[UnitMoveType.AIR].damageMix,
          },
        }
      : {}),
  };
}
