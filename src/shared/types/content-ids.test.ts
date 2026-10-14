import { describe, expect, it } from 'vitest';
import {
  CREEP_TYPE_IDS,
  CreepTypeId,
  createModifierId,
  isCreepTypeId,
  isRaceId,
  isTowerTypeId,
  RACE_IDS,
  RaceId,
  TOWER_TYPE_IDS,
  TowerTypeId,
  type ModifierId,
} from './content-ids';

// Entity content is checked against these ids in
// `entities/race-registry/model/canonicalContentIds.test.ts`.

describe('shared/types/content-ids', () => {
  describe('RaceId', () => {
    it('defines all four MVP races with stable string values', () => {
      expect(RaceId.UNDEAD).toBe('UNDEAD');
      expect(RaceId.ORC).toBe('ORC');
      expect(RaceId.HUMAN).toBe('HUMAN');
      expect(RaceId.ELF).toBe('ELF');
    });

    it('exposes a centralized list with no duplicate keys', () => {
      const unique = new Set<string>(RACE_IDS);
      expect(unique.size).toBe(RACE_IDS.length);
      expect(RACE_IDS).toHaveLength(4);
    });

    it('accepts known races and rejects unknown values via isRaceId', () => {
      expect(isRaceId('UNDEAD')).toBe(true);
      expect(isRaceId('ELF')).toBe(true);
      expect(isRaceId('demon')).toBe(false);
      expect(isRaceId('')).toBe(false);
    });
  });

  describe('TowerTypeId', () => {
    it('names every archetype the game can build', () => {
      expect(TowerTypeId.SINGLE).toBe('single');
      expect(TowerTypeId.SPLASH).toBe('splash');
      expect(TowerTypeId.FROST).toBe('frost');
    });

    it('exposes a centralized list with no duplicate keys', () => {
      const unique = new Set<string>(TOWER_TYPE_IDS);
      expect(unique.size).toBe(TOWER_TYPE_IDS.length);
      expect(TOWER_TYPE_IDS).toEqual(Object.values(TowerTypeId));
    });

    it('accepts known tower types and rejects unknown values', () => {
      expect(isTowerTypeId('single')).toBe(true);
      expect(isTowerTypeId('splash')).toBe(true);
      expect(isTowerTypeId('frost')).toBe(true);
      expect(isTowerTypeId('cannon')).toBe(false);
    });
  });

  describe('CreepTypeId', () => {
    it('defines the basic creep type with its original string value', () => {
      expect(CreepTypeId.BASIC).toBe('basic');
    });

    it('exposes a centralized list with no duplicate keys', () => {
      const unique = new Set<string>(CREEP_TYPE_IDS);
      expect(unique.size).toBe(CREEP_TYPE_IDS.length);
      expect(CREEP_TYPE_IDS).toHaveLength(1);
    });

    it('accepts known creep types and rejects unknown values', () => {
      expect(isCreepTypeId('basic')).toBe(true);
      expect(isCreepTypeId('elite')).toBe(false);
    });
  });

  describe('ModifierId', () => {
    it('produces nominal branded values via the safe constructor', () => {
      const id: ModifierId = createModifierId('frost.slow');
      expect(typeof id).toBe('string');
      expect(id).toBe('frost.slow');
    });

    it('is a future-safe type with no concrete modifiers registered yet', () => {
      const noRegistry = (globalThis as { __MODIFIER_REGISTRY__?: unknown }).__MODIFIER_REGISTRY__;
      expect(noRegistry).toBeUndefined();
    });
  });
});
