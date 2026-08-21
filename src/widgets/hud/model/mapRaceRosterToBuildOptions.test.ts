import { describe, expect, it } from 'vitest';
import { mapRaceRosterToBuildOptions } from './mapRaceRosterToBuildOptions';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { RACE_IDS, RaceId, TowerTypeId } from '../../../shared/types/content-ids';

describe('mapRaceRosterToBuildOptions', () => {
  it('offers exactly the towers the race can build', () => {
    for (const race of RACE_IDS) {
      const options = mapRaceRosterToBuildOptions({ raceId: race, gold: 1000, selectedTowerType: null });

      expect(options.map((option) => option.towerId), race)
        .toEqual(getBuildableTowersByFaction(race).map((tower) => tower.id));
    }
  });

  it('swaps the buildable set when the race changes', () => {
    const undead = mapRaceRosterToBuildOptions({ raceId: RaceId.UNDEAD, gold: 1000, selectedTowerType: null });
    const elf = mapRaceRosterToBuildOptions({ raceId: RaceId.ELF, gold: 1000, selectedTowerType: null });

    expect(undead.map((option) => option.towerId)).not.toEqual(elf.map((option) => option.towerId));
  });

  it('marks a tower unaffordable when it costs more than the gold on hand', () => {
    const [cheapest] = [...mapRaceRosterToBuildOptions({
      raceId: RaceId.UNDEAD,
      gold: 1000,
      selectedTowerType: null,
    })].sort((left, right) => left.costGold - right.costGold);

    const options = mapRaceRosterToBuildOptions({
      raceId: RaceId.UNDEAD,
      gold: cheapest.costGold - 1,
      selectedTowerType: null,
    });

    expect(options.every((option) => !option.isAffordable)).toBe(true);
    expect(options[0].ariaLabel).toContain('not affordable');
  });

  it('marks the selected archetype', () => {
    const options = mapRaceRosterToBuildOptions({
      raceId: RaceId.UNDEAD,
      gold: 1000,
      selectedTowerType: TowerTypeId.SPLASH,
    });

    const selected = options.filter((option) => option.isSelected);

    expect(selected).toHaveLength(1);
    expect(selected[0].towerType).toBe(TowerTypeId.SPLASH);
  });

  it('summarises what each archetype does beyond damage', () => {
    const hintByArchetype = new Map(
      RACE_IDS.flatMap((race) =>
        mapRaceRosterToBuildOptions({ raceId: race, gold: 1000, selectedTowerType: null })
          .map((option) => [option.towerType, option.effectHint] as const),
      ),
    );

    expect(hintByArchetype.get(TowerTypeId.SINGLE)).toBe('Single target');
    expect(hintByArchetype.get(TowerTypeId.SPLASH)).toBe('Area');
    expect(hintByArchetype.get(TowerTypeId.FROST)).toBe('Slows');
    expect(hintByArchetype.get(TowerTypeId.POISON)).toBe('Poison');
    expect(hintByArchetype.get(TowerTypeId.CHAIN)).toMatch(/^Chains \d+$/);
    expect(hintByArchetype.get(TowerTypeId.SUPPORT)).toBe('Boosts towers');
  });

  it('names cost and effect in the accessible label', () => {
    const [option] = mapRaceRosterToBuildOptions({
      raceId: RaceId.ORC,
      gold: 1000,
      selectedTowerType: null,
    });

    expect(option.ariaLabel).toContain(option.name);
    expect(option.ariaLabel).toContain(`${option.costGold} gold`);
    expect(option.ariaLabel).toContain(option.effectHint);
  });
});
