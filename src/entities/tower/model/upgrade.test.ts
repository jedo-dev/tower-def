import { describe, expect, it } from 'vitest';
import {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForLevel,
  getUpgradeCost,
  isMaxLevel,
} from './upgrade';
import { TOWER_UPGRADE_CONFIG } from './types';
import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import { TOWER_TYPE_IDS, TowerTypeId } from '../../../shared/types/content-ids';

/** Upgrade curves are authored content, so the tests read the same source. */
const SINGLE_LEVELS = TOWER_UPGRADE_CONFIG[TowerTypeId.SINGLE].levels;
const LEVEL_2_COST = SINGLE_LEVELS[1].upgradeCostGold;
const LEVEL_3_COST = SINGLE_LEVELS[2].upgradeCostGold;
const MAX_LEVEL = TOWER_UPGRADE_CONFIG[TowerTypeId.SINGLE].maxLevel;

describe('tower upgrade level boundaries', () => {
  it('reports max level per archetype', () => {
    for (const towerType of TOWER_TYPE_IDS) {
      const config = TOWER_UPGRADE_CONFIG[towerType];

      expect(isMaxLevel(towerType, config.maxLevel), towerType).toBe(true);
      expect(isMaxLevel(towerType, config.maxLevel - 1), towerType).toBe(false);
      expect(isMaxLevel(towerType, config.maxLevel + 1), towerType).toBe(true);
    }
  });
});

describe('tower upgrade cost resolution', () => {
  it('points at the cost of the next level', () => {
    expect(getUpgradeCost(TowerTypeId.SINGLE, 1)).toBe(LEVEL_2_COST);
    expect(getUpgradeCost(TowerTypeId.SINGLE, 2)).toBe(LEVEL_3_COST);
  });

  it('returns null at max level', () => {
    expect(getUpgradeCost(TowerTypeId.SINGLE, MAX_LEVEL)).toBeNull();
  });

  it('prices every archetype independently', () => {
    const costs = TOWER_TYPE_IDS.map((towerType) => getUpgradeCost(towerType, 1));

    expect(costs.every((cost) => cost !== null && cost > 0)).toBe(true);
    expect(new Set(costs).size).toBeGreaterThan(1);
  });
});

describe('tower upgrade affordability', () => {
  it('allows an upgrade the player can pay for', () => {
    expect(canAffordUpgrade(TowerTypeId.SINGLE, 1, LEVEL_2_COST).allowed).toBe(true);
  });

  it('rejects an upgrade one gold short', () => {
    const result = canAffordUpgrade(TowerTypeId.SINGLE, 1, LEVEL_2_COST - 1);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_gold');
  });

  it('rejects an upgrade at max level regardless of gold', () => {
    const result = canAffordUpgrade(TowerTypeId.SINGLE, MAX_LEVEL, 9_999);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('max_level');
  });
});

describe('tower stats per level', () => {
  it('returns the authored level 1 stats', () => {
    expect(getTowerStatsForLevel(TowerTypeId.SINGLE, 1)).toEqual(SINGLE_LEVELS[0].stats);
  });

  it('improves damage, range and cooldown with every level', () => {
    for (const towerType of TOWER_TYPE_IDS) {
      const levels = TOWER_UPGRADE_CONFIG[towerType].levels;

      levels.slice(1).forEach((entry, index) => {
        const previous = levels[index].stats;

        expect(entry.stats.damage, towerType).toBeGreaterThanOrEqual(previous.damage);
        expect(entry.stats.range, towerType).toBeGreaterThanOrEqual(previous.range);
        expect(entry.stats.attackCooldownMs, towerType).toBeLessThanOrEqual(previous.attackCooldownMs);
      });
    }
  });

  it('keeps the splash radius across levels', () => {
    expect(getTowerStatsForLevel(TowerTypeId.SPLASH, 1)?.splashRadius).toBeDefined();
    expect(getTowerStatsForLevel(TowerTypeId.SPLASH, 3)?.splashRadius).toBeDefined();
  });

  it('deepens the effect an archetype applies', () => {
    const firstChill = getTowerStatsForLevel(TowerTypeId.FROST, 1)!.onHitEffects![0];
    const lastChill = getTowerStatsForLevel(TowerTypeId.FROST, 3)!.onHitEffects![0];

    expect(lastChill.magnitude!).toBeGreaterThan(firstChill.magnitude!);
  });

  it('widens the aura a support tower projects', () => {
    const firstAura = getTowerStatsForLevel(TowerTypeId.SUPPORT, 1)!.aura!;
    const lastAura = getTowerStatsForLevel(TowerTypeId.SUPPORT, 3)!.aura!;

    expect(lastAura.radiusCells).toBeGreaterThan(firstAura.radiusCells);
    expect(lastAura.attackSpeedBonus).toBeGreaterThan(firstAura.attackSpeedBonus);
  });

  it('returns null outside the curve', () => {
    expect(getTowerStatsForLevel(TowerTypeId.SINGLE, 0)).toBeNull();
    expect(getTowerStatsForLevel(TowerTypeId.SINGLE, MAX_LEVEL + 1)).toBeNull();
  });
});

describe('tower investment and sell value', () => {
  it('adds up what the player paid to reach a level', () => {
    expect(getTotalInvestedGold(TowerTypeId.SINGLE, 1)).toBe(0);
    expect(getTotalInvestedGold(TowerTypeId.SINGLE, 2)).toBe(LEVEL_2_COST);
    expect(getTotalInvestedGold(TowerTypeId.SINGLE, 3)).toBe(LEVEL_2_COST + LEVEL_3_COST);
  });

  it('refunds the sell ratio of everything invested', () => {
    const buildCost = 50;
    const ratio = ECONOMY_BALANCE.towerSellRatio;

    expect(getSellValue(TowerTypeId.SINGLE, 1, buildCost)).toBe(Math.floor(buildCost * ratio));
    expect(getSellValue(TowerTypeId.SINGLE, 3, buildCost)).toBe(
      Math.floor((buildCost + LEVEL_2_COST + LEVEL_3_COST) * ratio),
    );
  });
});

describe('tower upgrade content completeness', () => {
  it('gives every archetype a curve that starts free and rises', () => {
    for (const towerType of TOWER_TYPE_IDS) {
      const config = TOWER_UPGRADE_CONFIG[towerType];

      expect(config.levels.length, towerType).toBeGreaterThan(1);
      expect(config.maxLevel, towerType).toBe(config.levels.length);
      expect(config.levels[0].upgradeCostGold, towerType).toBe(0);

      config.levels.forEach((entry, index) => {
        expect(entry.level, towerType).toBe(index + 1);
        if (index > 0) {
          expect(entry.upgradeCostGold, towerType).toBeGreaterThan(
            config.levels[index - 1].upgradeCostGold,
          );
        }
      });
    }
  });
});
