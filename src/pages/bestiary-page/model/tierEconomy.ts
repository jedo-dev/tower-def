import {
  getIncomeBonusByTier,
  getSendCostByTier,
  getUnitTypeSendCapByTier,
} from '../../../entities/duel-match';
import { WAVE_TIER_UNLOCK_WAVE } from '../../../entities/wave';
import type { UnitTier } from '../../../entities/unit';
import type { TierEconomyViewModel } from './types';

/**
 * The one place the bestiary reads economy numbers from. Everything else on
 * the page takes a `TierEconomyViewModel`, so when a shared content helper for
 * per-tier send cost, income, cap and unlock wave lands this is the only
 * function that changes.
 */
export function getTierEconomy(tier: UnitTier): TierEconomyViewModel {
  return {
    sendCost: getSendCostByTier(tier),
    incomeBonus: getIncomeBonusByTier(tier),
    perWaveCap: getUnitTypeSendCapByTier(tier),
    unlockWave: WAVE_TIER_UNLOCK_WAVE[tier],
  };
}
