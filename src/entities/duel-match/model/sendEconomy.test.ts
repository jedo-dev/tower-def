import { describe, expect, it } from 'vitest';
import { UnitTier } from '../../unit/model/types';
import { SEND_CREEP_COST_BY_TIER, SEND_CREEP_INCOME_BONUS_BY_TIER } from './balance';
import {
  canAffordSend,
  getIncomeBonusByTier,
  getSendCostByTier,
  lookupTierValue,
} from './sendEconomy';

describe('entities/duel-match/sendEconomy', () => {
  describe('getSendCostByTier', () => {
    it('returns cost for tier 1', () => {
      expect(getSendCostByTier(UnitTier.TIER_1)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_1]);
    });

    it('returns cost for tier 2', () => {
      expect(getSendCostByTier(UnitTier.TIER_2)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_2]);
    });

    it('returns cost for tier 3', () => {
      expect(getSendCostByTier(UnitTier.TIER_3)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_3]);
    });

    it('returns cost for tier 4', () => {
      expect(getSendCostByTier(UnitTier.TIER_4)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_4]);
    });

    it('returns cost for tier 5', () => {
      expect(getSendCostByTier(UnitTier.TIER_5)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_5]);
    });

    it('returns cost for tier 6', () => {
      expect(getSendCostByTier(UnitTier.TIER_6)).toBe(SEND_CREEP_COST_BY_TIER[UnitTier.TIER_6]);
    });

    it('higher tiers cost more than lower tiers', () => {
      expect(getSendCostByTier(UnitTier.TIER_2)).toBeGreaterThan(
        getSendCostByTier(UnitTier.TIER_1),
      );
      expect(getSendCostByTier(UnitTier.TIER_3)).toBeGreaterThan(
        getSendCostByTier(UnitTier.TIER_2),
      );
      expect(getSendCostByTier(UnitTier.TIER_4)).toBeGreaterThan(
        getSendCostByTier(UnitTier.TIER_3),
      );
      expect(getSendCostByTier(UnitTier.TIER_5)).toBeGreaterThan(
        getSendCostByTier(UnitTier.TIER_4),
      );
      expect(getSendCostByTier(UnitTier.TIER_6)).toBeGreaterThan(
        getSendCostByTier(UnitTier.TIER_5),
      );
    });
  });

  describe('getIncomeBonusByTier', () => {
    it('returns income bonus for tier 1', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_1)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_1],
      );
    });

    it('returns income bonus for tier 2', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_2)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_2],
      );
    });

    it('returns income bonus for tier 3', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_3)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_3],
      );
    });

    it('returns income bonus for tier 4', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_4)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_4],
      );
    });

    it('returns income bonus for tier 5', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_5)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_5],
      );
    });

    it('returns income bonus for tier 6', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_6)).toBe(
        SEND_CREEP_INCOME_BONUS_BY_TIER[UnitTier.TIER_6],
      );
    });

    it('higher tiers give more income bonus', () => {
      expect(getIncomeBonusByTier(UnitTier.TIER_2)).toBeGreaterThan(
        getIncomeBonusByTier(UnitTier.TIER_1),
      );
      expect(getIncomeBonusByTier(UnitTier.TIER_3)).toBeGreaterThan(
        getIncomeBonusByTier(UnitTier.TIER_2),
      );
      expect(getIncomeBonusByTier(UnitTier.TIER_4)).toBeGreaterThan(
        getIncomeBonusByTier(UnitTier.TIER_3),
      );
      expect(getIncomeBonusByTier(UnitTier.TIER_5)).toBeGreaterThan(
        getIncomeBonusByTier(UnitTier.TIER_4),
      );
      expect(getIncomeBonusByTier(UnitTier.TIER_6)).toBeGreaterThan(
        getIncomeBonusByTier(UnitTier.TIER_5),
      );
    });
  });

  describe('canAffordSend', () => {
    it('returns true when gold equals cost', () => {
      const cost = getSendCostByTier(UnitTier.TIER_1);
      expect(canAffordSend(cost, UnitTier.TIER_1)).toBe(true);
    });

    it('returns true when gold exceeds cost', () => {
      expect(canAffordSend(9999, UnitTier.TIER_1)).toBe(true);
    });

    it('returns false when gold is below cost', () => {
      const cost = getSendCostByTier(UnitTier.TIER_1);
      expect(canAffordSend(cost - 1, UnitTier.TIER_1)).toBe(false);
    });

    it('returns false when gold is zero', () => {
      expect(canAffordSend(0, UnitTier.TIER_1)).toBe(false);
    });

    it('higher tiers require more gold', () => {
      const tier2Cost = getSendCostByTier(UnitTier.TIER_2);
      expect(canAffordSend(tier2Cost - 1, UnitTier.TIER_2)).toBe(false);
      expect(canAffordSend(tier2Cost, UnitTier.TIER_2)).toBe(true);
    });
  });

  describe('lookupTierValue', () => {
    it('returns value from table for existing tier', () => {
      const table = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60 } as Record<UnitTier, number>;
      expect(lookupTierValue(table, UnitTier.TIER_1)).toBe(10);
      expect(lookupTierValue(table, UnitTier.TIER_3)).toBe(30);
    });

    it('throws for missing tier in table', () => {
      const table = { 1: 10 } as unknown as Record<UnitTier, number>;
      expect(() => lookupTierValue(table, UnitTier.TIER_6)).toThrow();
    });
  });
});
