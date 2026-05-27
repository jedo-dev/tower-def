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
import { builderFactions, BuilderFaction } from '../../entities/builder-faction';
import { enemyFactions, EnemyFaction } from '../../entities/enemy-faction';
import { buildableTowers } from '../../entities/tower';
import { undeadUnits, Faction } from '../../entities/unit';

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

    it('is the single source of truth for builder, enemy and unit faction enums', () => {
      expect(BuilderFaction).toBe(RaceId);
      expect(EnemyFaction).toBe(RaceId);
      expect(Faction).toBe(RaceId);
    });
  });

  describe('TowerTypeId', () => {
    it('defines archer and splash with the original string values', () => {
      expect(TowerTypeId.ARCHER).toBe('archer');
      expect(TowerTypeId.SPLASH).toBe('splash');
    });

    it('exposes a centralized list with no duplicate keys', () => {
      const unique = new Set<string>(TOWER_TYPE_IDS);
      expect(unique.size).toBe(TOWER_TYPE_IDS.length);
      expect(TOWER_TYPE_IDS).toHaveLength(2);
    });

    it('accepts known tower types and rejects unknown values', () => {
      expect(isTowerTypeId('archer')).toBe(true);
      expect(isTowerTypeId('splash')).toBe(true);
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

  describe('content configs use canonical IDs', () => {
    it('every builder faction references a RaceId value', () => {
      for (const faction of builderFactions) {
        expect(isRaceId(faction.id)).toBe(true);
      }
    });

    it('every enemy faction references a RaceId value', () => {
      for (const faction of enemyFactions) {
        expect(isRaceId(faction.id)).toBe(true);
      }
    });

    it('every buildable tower references a RaceId faction and a TowerTypeId tower type', () => {
      for (const tower of buildableTowers) {
        expect(isRaceId(tower.faction)).toBe(true);
        expect(isTowerTypeId(tower.towerType)).toBe(true);
      }
    });

    it('every undead unit references a RaceId faction', () => {
      for (const unit of undeadUnits) {
        expect(isRaceId(unit.faction)).toBe(true);
      }
    });
  });
});
