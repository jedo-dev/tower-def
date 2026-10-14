import { describe, expect, it } from 'vitest';
import { UNIT_TIERS, UnitTier } from '../../unit/model/types';
import { WAVE_TIER_UNLOCK_WAVE } from '../../wave/model/waveBalance';
import {
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
  SEND_UNIT_TYPE_CAP_BY_TIER,
} from './balance';
import { getSendTierDisplay, listSendTierDisplays } from './sendEconomyDisplay';

describe('entities/duel-match/sendEconomyDisplay', () => {
  it('reads every number from the balance tables', () => {
    for (const tier of UNIT_TIERS) {
      expect(getSendTierDisplay(tier)).toEqual({
        tier,
        sendCostGold: SEND_CREEP_COST_BY_TIER[tier],
        incomeBonusGold: SEND_CREEP_INCOME_BONUS_BY_TIER[tier],
        sendCapPerType: SEND_UNIT_TYPE_CAP_BY_TIER[tier],
        baselineUnlockWave: WAVE_TIER_UNLOCK_WAVE[tier],
      });
    }
  });

  it('describes a tier-one send the way the panel shows it', () => {
    expect(getSendTierDisplay(UnitTier.TIER_1)).toEqual({
      tier: UnitTier.TIER_1,
      sendCostGold: 50,
      incomeBonusGold: 10,
      sendCapPerType: 6,
      baselineUnlockWave: 1,
    });
  });

  it('lists one row per tier in tier order', () => {
    const rows = listSendTierDisplays();

    expect(rows.map((row) => row.tier)).toEqual([...UNIT_TIERS]);
  });

  it('makes higher tiers dearer, rarer and later', () => {
    const rows = listSendTierDisplays();

    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const current = rows[index];

      expect(current.sendCostGold).toBeGreaterThan(previous.sendCostGold);
      expect(current.incomeBonusGold).toBeGreaterThan(previous.incomeBonusGold);
      expect(current.sendCapPerType).toBeLessThanOrEqual(previous.sendCapPerType);
      expect(current.baselineUnlockWave).toBeGreaterThan(previous.baselineUnlockWave);
    }
  });
});
