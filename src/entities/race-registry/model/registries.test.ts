import { describe, expect, it } from 'vitest';
import { RACE_IDS, RaceId } from '../../../shared/types/content-ids';
import { buildableTowers } from '../../tower';
import { undeadUnits, orcUnits, humanUnits, elfUnits } from '../../unit';
import { getAllRaceRegistries, getRaceRegistry, raceRegistries } from './registries';
import type { RaceRegistryEntry } from './types';

const allUnits = [...undeadUnits, ...orcUnits, ...humanUnits, ...elfUnits];

describe('entities/race-registry', () => {
  describe('raceRegistries', () => {
    it('contains an entry for every defined RaceId', () => {
      for (const raceId of RACE_IDS) {
        expect(raceRegistries[raceId]).toBeDefined();
        expect(raceRegistries[raceId].raceId).toBe(raceId);
      }
    });

    it('has exactly one entry per race with no duplicates', () => {
      const entries = getAllRaceRegistries();
      expect(entries).toHaveLength(RACE_IDS.length);

      const raceIds = entries.map((entry) => entry.raceId);
      const uniqueRaceIds = new Set(raceIds);
      expect(uniqueRaceIds.size).toBe(raceIds.length);
    });
  });

  describe('getRaceRegistry', () => {
    it('returns the registry for a valid race', () => {
      const registry = getRaceRegistry(RaceId.UNDEAD);
      expect(registry.raceId).toBe(RaceId.UNDEAD);
      expect(registry.name).toBe('Undead');
    });

    it('throws for an unknown race id', () => {
      expect(() => getRaceRegistry('demon' as RaceId)).toThrow('Missing race registry for: demon');
    });
  });

  describe('registry completeness', () => {
    it('every registry has a non-empty name', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.name.length).toBeGreaterThan(0);
      }
    });

    it('every registry has a non-empty description', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.description.length).toBeGreaterThan(0);
      }
    });

    it('every registry has a valid theme color', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.themeColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('every registry has a defined non-empty starter tower id', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.starterTowerId).toBeDefined();
        expect(entry.starterTowerId.length).toBeGreaterThan(0);
      }
    });

    it('every registry has at least one buildable tower', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.buildableTowerIds.length).toBeGreaterThan(0);
      }
    });

    it('every registry has at least one sendable creep', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.sendableCreepIds.length).toBeGreaterThan(0);
      }
    });

    it('every registry starter tower is in its buildable towers list', () => {
      for (const entry of getAllRaceRegistries()) {
        expect(entry.buildableTowerIds).toContain(entry.starterTowerId);
      }
    });
  });

  describe('registry references valid content', () => {
    it('every buildable tower id exists in the buildableTowers config', () => {
      const buildableTowerIds = new Set(buildableTowers.map((t) => t.id));

      for (const entry of getAllRaceRegistries()) {
        for (const towerId of entry.buildableTowerIds) {
          expect(buildableTowerIds.has(towerId)).toBe(true);
        }
      }
    });

    it('every starter tower id exists in the buildableTowers config', () => {
      const buildableTowerIds = new Set(buildableTowers.map((t) => t.id));

      for (const entry of getAllRaceRegistries()) {
        expect(buildableTowerIds.has(entry.starterTowerId)).toBe(true);
      }
    });

    it('every sendable creep id exists in the unit configs', () => {
      const unitIds = new Set(allUnits.map((u) => u.id));

      for (const entry of getAllRaceRegistries()) {
        for (const creepId of entry.sendableCreepIds) {
          expect(unitIds.has(creepId)).toBe(true);
        }
      }
    });

    it('every buildable tower belongs to the correct race', () => {
      for (const entry of getAllRaceRegistries()) {
        for (const towerId of entry.buildableTowerIds) {
          const tower = buildableTowers.find((t) => t.id === towerId);
          expect(tower).toBeDefined();
          expect(tower!.faction).toBe(entry.raceId);
        }
      }
    });

    it('every sendable creep belongs to the correct race', () => {
      for (const entry of getAllRaceRegistries()) {
        for (const creepId of entry.sendableCreepIds) {
          const unit = allUnits.find((u) => u.id === creepId);
          expect(unit).toBeDefined();
          expect(unit!.faction).toBe(entry.raceId);
        }
      }
    });
  });

  describe('no duplicate ids across registries', () => {
    it('buildable tower ids are unique across all races', () => {
      const allTowerIds: string[] = [];
      for (const entry of getAllRaceRegistries()) {
        allTowerIds.push(...entry.buildableTowerIds);
      }
      const uniqueTowerIds = new Set(allTowerIds);
      expect(uniqueTowerIds.size).toBe(allTowerIds.length);
    });

    it('sendable creep ids are unique across all races', () => {
      const allCreepIds: string[] = [];
      for (const entry of getAllRaceRegistries()) {
        allCreepIds.push(...entry.sendableCreepIds);
      }
      const uniqueCreepIds = new Set(allCreepIds);
      expect(uniqueCreepIds.size).toBe(allCreepIds.length);
    });

    it('no tower appears in multiple race registries', () => {
      const towerToRace = new Map<string, RaceId>();
      for (const entry of getAllRaceRegistries()) {
        for (const towerId of entry.buildableTowerIds) {
          expect(towerToRace.has(towerId)).toBe(false);
          towerToRace.set(towerId, entry.raceId);
        }
      }
    });

    it('no creep appears in multiple race registries', () => {
      const creepToRace = new Map<string, RaceId>();
      for (const entry of getAllRaceRegistries()) {
        for (const creepId of entry.sendableCreepIds) {
          expect(creepToRace.has(creepId)).toBe(false);
          creepToRace.set(creepId, entry.raceId);
        }
      }
    });
  });

  describe('registry snapshot', () => {
    it('matches the expected structure for all races', () => {
      const entries = getAllRaceRegistries();
      const snapshot = entries.map((e: RaceRegistryEntry) => ({
        raceId: e.raceId,
        name: e.name,
        starterTower: e.starterTowerId,
        towerCount: e.buildableTowerIds.length,
        creepCount: e.sendableCreepIds.length,
      }));

      expect(snapshot).toEqual([
        { raceId: 'UNDEAD', name: 'Undead', starterTower: 'undead_bone_archer_tower', towerCount: 2, creepCount: 4 },
        { raceId: 'ORC', name: 'Orc', starterTower: 'orc_spear_watchtower', towerCount: 1, creepCount: 4 },
        { raceId: 'HUMAN', name: 'Human', starterTower: 'human_guard_archer_tower', towerCount: 1, creepCount: 4 },
        { raceId: 'ELF', name: 'Elf', starterTower: 'elf_moon_archer_tower', towerCount: 1, creepCount: 4 },
      ]);
    });
  });
});
