import { describe, expect, it } from 'vitest';
import { isRaceId, isTowerTypeId, RACE_IDS, RaceId } from '../../../shared/types/content-ids';
import { builderFactions, BuilderFaction } from '../../builder-faction';
import { enemyFactions, EnemyFaction } from '../../enemy-faction';
import { buildableTowers } from '../../tower';
import { undeadUnits, orcUnits, humanUnits, elfUnits, Faction } from '../../unit';
import { raceRegistries } from './registries';

describe('entity content uses the canonical ids from shared/types/content-ids', () => {
  it('shares one RaceId enum between builder, enemy and unit factions', () => {
    expect(BuilderFaction).toBe(RaceId);
    expect(EnemyFaction).toBe(RaceId);
    expect(Faction).toBe(RaceId);
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

    it('every orc unit references a RaceId faction', () => {
      for (const unit of orcUnits) {
        expect(isRaceId(unit.faction)).toBe(true);
      }
    });

    it('every human unit references a RaceId faction', () => {
      for (const unit of humanUnits) {
        expect(isRaceId(unit.faction)).toBe(true);
      }
    });

    it('every elf unit references a RaceId faction', () => {
      for (const unit of elfUnits) {
        expect(isRaceId(unit.faction)).toBe(true);
      }
    });
  });

  describe('race registries use canonical IDs', () => {
    it('every race registry entry references a valid RaceId', () => {
      for (const raceId of RACE_IDS) {
        const registry = raceRegistries[raceId];
        expect(registry).toBeDefined();
        expect(isRaceId(registry.raceId)).toBe(true);
      }
    });

    it('every race registry has a non-empty name', () => {
      for (const raceId of RACE_IDS) {
        const registry = raceRegistries[raceId];
        expect(registry.name.length).toBeGreaterThan(0);
      }
    });

    it('every race registry has at least one buildable tower', () => {
      for (const raceId of RACE_IDS) {
        const registry = raceRegistries[raceId];
        expect(registry.buildableTowerIds.length).toBeGreaterThan(0);
      }
    });

    it('every race registry has at least one sendable creep', () => {
      for (const raceId of RACE_IDS) {
        const registry = raceRegistries[raceId];
        expect(registry.sendableCreepIds.length).toBeGreaterThan(0);
      }
    });
  });
});
