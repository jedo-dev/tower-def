import { UNIT_TIERS, type UnitTier } from '../../unit/model/types';
import { WAVE_TIER_UNLOCK_WAVE } from '../../wave/model/waveBalance';
import { getIncomeBonusByTier, getSendCostByTier } from './sendEconomy';
import { getUnitTypeSendCapByTier } from './sendLimits';

/**
 * Everything a roster screen (bestiary, send panel) shows about a tier, read
 * from the balance tables so the UI never carries its own copy of a number.
 */
export type SendTierDisplay = {
  tier: UnitTier;
  /** Gold one creature of this tier costs to send in duel mode. */
  sendCostGold: number;
  /** Permanent income the sender gains per creature sent. */
  incomeBonusGold: number;
  /** Most creatures of one type of this tier a side may queue for one wave. */
  sendCapPerType: number;
  /** First baseline wave the tier can appear in. */
  baselineUnlockWave: number;
};

export function getSendTierDisplay(tier: UnitTier): SendTierDisplay {
  return {
    tier,
    sendCostGold: getSendCostByTier(tier),
    incomeBonusGold: getIncomeBonusByTier(tier),
    sendCapPerType: getUnitTypeSendCapByTier(tier),
    baselineUnlockWave: WAVE_TIER_UNLOCK_WAVE[tier],
  };
}

/** One row per tier, in tier order. */
export function listSendTierDisplays(): SendTierDisplay[] {
  return UNIT_TIERS.map(getSendTierDisplay);
}
