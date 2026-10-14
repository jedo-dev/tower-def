import { describe, expect, it } from 'vitest';
import { buildBestiaryViewModel } from './buildBestiaryViewModel';
import { getTierEconomy } from './tierEconomy';
import { mapUnitToCreepCard, mapUnitsToCreepCards } from './creepCards';
import { mapTowerToTowerCard } from './towerCards';
import { RACE_IDS, RaceId } from '../../../shared/types/content-ids';
import { FACTION_THEME_COLOR_VARS } from '../../../shared/constants/theme';
import {
  SEND_CREEP_COST_BY_TIER,
  SEND_CREEP_INCOME_BONUS_BY_TIER,
  SEND_UNIT_TYPE_CAP_BY_TIER,
} from '../../../entities/duel-match';
import { WAVE_TIER_UNLOCK_WAVE } from '../../../entities/wave';
import { getAllRaceRegistries } from '../../../entities/race-registry';
import {
  getUnitsByFaction,
  resolveUnitConfigById,
  UNIT_TIERS,
  UnitTier,
  type UnitConfig,
} from '../../../entities/unit';
import { getBuildableTowersByFaction, resolveBuildableTowerById } from '../../../entities/tower';

describe('getTierEconomy', () => {
  it('reads send cost, income bonus, per-type cap and unlock wave from the balance tables', () => {
    for (const tier of UNIT_TIERS) {
      expect(getTierEconomy(tier)).toEqual({
        sendCost: SEND_CREEP_COST_BY_TIER[tier],
        incomeBonus: SEND_CREEP_INCOME_BONUS_BY_TIER[tier],
        perWaveCap: SEND_UNIT_TYPE_CAP_BY_TIER[tier],
        unlockWave: WAVE_TIER_UNLOCK_WAVE[tier],
      });
    }
  });
});

describe('creep cards', () => {
  it('carries the authored stats and traits of the unit', () => {
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const card = mapUnitToCreepCard(skeleton);

    expect(card).toMatchObject({
      id: 'undead_skeleton',
      name: skeleton.name,
      tier: UnitTier.TIER_1,
      health: skeleton.health,
      speed: skeleton.speed,
      armor: skeleton.armor,
      armorType: 'unarmored',
      sizeClass: 'small',
      moveType: 'ground',
      rewardGold: skeleton.rewardGold,
      economy: getTierEconomy(UnitTier.TIER_1),
    });
    expect(card.description).toBe(skeleton.description ?? null);
  });

  it('sorts creeps by tier and keeps the authored order within a tier', () => {
    const units = getUnitsByFaction(RaceId.UNDEAD);
    const cards = mapUnitsToCreepCards(units);
    const tiers = cards.map((card) => card.tier);

    expect(tiers).toEqual([...tiers].sort((left, right) => left - right));
    const tierOneIds = units.filter((unit) => unit.tier === UnitTier.TIER_1).map((unit) => unit.id);
    expect(cards.filter((card) => card.tier === UnitTier.TIER_1).map((card) => card.id)).toEqual(
      tierOneIds,
    );
  });

  it('shows lore when the content carries it and null otherwise', () => {
    const ghoul = resolveUnitConfigById('undead_ghoul');
    const withLore = { ...ghoul, lore: 'It hungers.' } as UnitConfig;

    expect(mapUnitToCreepCard(withLore).lore).toBe('It hungers.');
    expect(mapUnitToCreepCard({ ...ghoul, lore: '' } as UnitConfig).lore).toBeNull();
    const { lore: _authoredLore, ...withoutLore } = ghoul;
    expect(mapUnitToCreepCard(withoutLore as UnitConfig).lore).toBeNull();
  });
});

describe('tower cards', () => {
  it('describes a splash tower by its radius', () => {
    const card = mapTowerToTowerCard(resolveBuildableTowerById('undead_plague_tower'));

    expect(card.archetypeName).toBe('Splash');
    expect(card.specials).toEqual([{ key: 'splash', label: 'Splash', value: '3 cells' }]);
  });

  it('describes a frost tower by its chill on hit', () => {
    const card = mapTowerToTowerCard(resolveBuildableTowerById('undead_frost_wyrm_nest'));

    expect(card.specials).toEqual([{ key: 'chill', label: 'Chill', value: '35% slower for 2.0s' }]);
  });

  it('describes a chain tower by its jumps', () => {
    const card = mapTowerToTowerCard(resolveBuildableTowerById('orc_lightning_totem'));

    expect(card.specials.map((special) => special.key)).toContain('chain');
    expect(card.specials.find((special) => special.key === 'chain')?.value).toBe(
      '3 jumps within 4 cells, -25% each',
    );
  });

  it('describes a support tower by its aura', () => {
    const card = mapTowerToTowerCard(resolveBuildableTowerById('undead_bone_obelisk'));

    expect(card.specials).toEqual([
      {
        key: 'aura',
        label: 'Aura',
        value: '+18% attack speed, +0.8 range within 5 cells',
      },
    ]);
  });

  it('summarises every upgrade level, the build level without an upgrade cost', () => {
    const card = mapTowerToTowerCard(resolveBuildableTowerById('undead_bone_archer_tower'));

    expect(card.levels.map((level) => level.level)).toEqual([1, 2, 3]);
    expect(card.levels[0].upgradeCost).toBeNull();
    expect(card.levels[1].upgradeCost).toBe(40);
    expect(card.levels[1].summary).toBe('30 dmg, 6.4 range, 0.8s');
  });
});

describe('buildBestiaryViewModel', () => {
  it('lists every race with its creeps, towers and theme token', () => {
    const viewModel = buildBestiaryViewModel();

    expect(viewModel.races.map((race) => race.raceId)).toEqual(RACE_IDS);
    for (const race of viewModel.races) {
      expect(race.creeps.length).toBe(getUnitsByFaction(race.raceId).length);
      expect(race.towers.length).toBe(getBuildableTowersByFaction(race.raceId).length);
      expect(race.themeColor).toBe(FACTION_THEME_COLOR_VARS[race.faction]);
      expect(race.themeColor).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it('renders whatever the injected content sources return', () => {
    const [undead] = getAllRaceRegistries();
    const ghoul = resolveUnitConfigById('undead_ghoul');
    const viewModel = buildBestiaryViewModel({
      races: [undead],
      unitsOf: () => [{ ...ghoul, tier: UnitTier.TIER_6, lore: 'Legend.' } as UnitConfig],
      towersOf: () => [],
    });

    expect(viewModel.races).toHaveLength(1);
    expect(viewModel.races[0].creeps).toHaveLength(1);
    expect(viewModel.races[0].creeps[0].economy).toEqual(getTierEconomy(UnitTier.TIER_6));
    expect(viewModel.races[0].creeps[0].lore).toBe('Legend.');
    expect(viewModel.races[0].towers).toEqual([]);
  });
});
