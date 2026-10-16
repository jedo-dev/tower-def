import { getRaceRegistry } from '../../../race-registry/model/registries';
import {
  NO_CREATURE_BRANCH_CHOICES,
  NO_CREATURE_GRADES,
  NO_CREATURE_XP,
  type CreatureTalentLedger,
} from '../../../unit/model/talents';
import type { UnitId } from '../../../unit/model/types';
import { getWaveHealthMultiplier } from '../../../wave/model/waveHealth';
import type { DecisionContext } from '../types';
import { CREATURE_VALUATION_BY_DIFFICULTY } from './constants';
import { UNKNOWN_DEFENCE_PROFILE } from './defenceProfile';
import { planCreatureDevelopment, type CreatureDevelopmentPlan } from './planCreatureDevelopment';

const NO_CREATURE_TALENTS: CreatureTalentLedger = {
  creatureXpByTier: NO_CREATURE_XP,
  creatureBranchChoices: NO_CREATURE_BRANCH_CHOICES,
  creatureGrades: NO_CREATURE_GRADES,
};

/**
 * The creature development of one build phase from a decision context: the
 * side's ledger, the defender's profile and the difficulty's valuation, with
 * `plannedSends` (queued plus about to be sent) deciding who develops first.
 * Nothing outside a build phase.
 */
export function planContextDevelopment(
  context: DecisionContext,
  plannedSends: readonly UnitId[],
): CreatureDevelopmentPlan {
  const ledger = context.creatureTalents ?? NO_CREATURE_TALENTS;
  if (context.phase !== 'build') {
    return { actions: [], ledger };
  }
  return planCreatureDevelopment({
    sendableUnitIds: getRaceRegistry(context.raceId).sendableCreepIds,
    ledger,
    plannedSends,
    profile: context.enemyDefenceProfile ?? UNKNOWN_DEFENCE_PROFILE,
    healthMultiplier: getWaveHealthMultiplier(context.round),
    valuation: CREATURE_VALUATION_BY_DIFFICULTY[context.difficulty],
  });
}
