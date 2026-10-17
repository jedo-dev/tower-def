import { describe, expect, it } from 'vitest';
import {
  CREATURE_SEND_UNLOCK_WAVE_BY_TIER,
  getCreatureSendUnlockWave,
  isCreatureTierUnlocked,
} from '../../../shared/constants/creatureSendUnlock';
import { UNIT_TIERS, UnitTier } from '../../unit/model/types';
import { getSendUnlockWave, getSendWaveNumber, isSendTierUnlocked } from './sendUnlock';

describe('creature send unlock schedule (tower-def-qpb)', () => {
  it('authors one unlock wave per tier, never decreasing with the tier', () => {
    const waves = UNIT_TIERS.map((tier) => getCreatureSendUnlockWave(tier));
    expect(waves).toEqual(UNIT_TIERS.map((tier) => CREATURE_SEND_UNLOCK_WAVE_BY_TIER[tier]));
    expect(waves[0]).toBe(1);
    for (let index = 1; index < waves.length; index += 1) {
      expect(waves[index]).toBeGreaterThanOrEqual(waves[index - 1]);
    }
  });

  it('keeps the opening wave sendable and gates the top tiers', () => {
    expect(getCreatureSendUnlockWave(UnitTier.TIER_1)).toBe(1);
    expect(getCreatureSendUnlockWave(UnitTier.TIER_6)).toBeGreaterThan(1);
  });

  it('unlocks a tier from its wave on, not one wave earlier', () => {
    for (const tier of UNIT_TIERS) {
      const unlockWave = getCreatureSendUnlockWave(tier);
      expect(isCreatureTierUnlocked(tier, unlockWave)).toBe(true);
      expect(isCreatureTierUnlocked(tier, unlockWave + 5)).toBe(true);
      expect(isCreatureTierUnlocked(tier, unlockWave - 1)).toBe(false);
    }
  });

  it('reads the round as the wave the send spawns in: the build phase after it', () => {
    expect(getSendWaveNumber(0)).toBe(1);
    for (const tier of UNIT_TIERS) {
      const unlockWave = getSendUnlockWave(tier);
      // After `unlockWave - 1` waves fought, the coming wave is the unlock wave.
      expect(isSendTierUnlocked(tier, unlockWave - 1)).toBe(true);
      expect(isSendTierUnlocked(tier, unlockWave - 2)).toBe(false);
    }
  });
});
