import { describe, expect, it } from 'vitest';
import { TowerUpgradeBalance, TOWER_UPGRADE_CONFIG } from '../../../shared/constants/tower';
import {
  canAffordUpgrade,
  getSellValue,
  getTotalInvestedGold,
  getTowerStatsForLevel,
  getUpgradeCost,
  isMaxLevel,
} from './upgrade';

describe('tower upgrade level boundaries', () => {
  it('archer tower max level matches config', () => {
    expect(isMaxLevel('single', TowerUpgradeBalance.MAX_LEVEL)).toBe(true);
  });

  it('splash tower max level matches config', () => {
    expect(isMaxLevel('splash', TowerUpgradeBalance.MAX_LEVEL)).toBe(true);
  });

  it('level below max is not max level', () => {
    expect(isMaxLevel('single', 1)).toBe(false);
    expect(isMaxLevel('single', 2)).toBe(false);
  });

  it('level above max is still treated as max level', () => {
    expect(isMaxLevel('single', TowerUpgradeBalance.MAX_LEVEL + 1)).toBe(true);
  });
});

describe('tower upgrade cost resolution', () => {
  it('level 1 has no upgrade cost (initial build)', () => {
    expect(getUpgradeCost('single', 1)).toBe(TowerUpgradeBalance.LEVEL_2_COST_GOLD);
  });

  it('level 2 upgrade cost points to level 3 cost', () => {
    expect(getUpgradeCost('single', 2)).toBe(TowerUpgradeBalance.LEVEL_3_COST_GOLD);
  });

  it('max level returns null upgrade cost', () => {
    expect(getUpgradeCost('single', TowerUpgradeBalance.MAX_LEVEL)).toBeNull();
  });

  it('splash tower upgrade costs are defined', () => {
    expect(getUpgradeCost('splash', 1)).toBe(TowerUpgradeBalance.LEVEL_2_COST_GOLD);
    expect(getUpgradeCost('splash', 2)).toBe(TowerUpgradeBalance.LEVEL_3_COST_GOLD);
    expect(getUpgradeCost('splash', TowerUpgradeBalance.MAX_LEVEL)).toBeNull();
  });
});

describe('tower upgrade affordability', () => {
  it('allows upgrade when gold is sufficient', () => {
    const result = canAffordUpgrade('single', 1, TowerUpgradeBalance.LEVEL_2_COST_GOLD);
    expect(result.allowed).toBe(true);
  });

  it('rejects upgrade when gold is insufficient', () => {
    const result = canAffordUpgrade('single', 1, TowerUpgradeBalance.LEVEL_2_COST_GOLD - 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_gold');
  });

  it('rejects upgrade at max level regardless of gold', () => {
    const result = canAffordUpgrade('single', TowerUpgradeBalance.MAX_LEVEL, 9999);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('max_level');
  });

  it('exact gold amount allows upgrade', () => {
    const result = canAffordUpgrade('single', 2, TowerUpgradeBalance.LEVEL_3_COST_GOLD);
    expect(result.allowed).toBe(true);
  });

  it('one gold short rejects upgrade', () => {
    const result = canAffordUpgrade('single', 2, TowerUpgradeBalance.LEVEL_3_COST_GOLD - 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_gold');
  });
});

describe('tower stats per level', () => {
  it('returns level 1 stats matching base combat config', () => {
    const stats = getTowerStatsForLevel('single', 1);
    expect(stats).not.toBeNull();
    expect(stats!.damage).toBe(20);
    expect(stats!.range).toBe(3);
    expect(stats!.attackCooldownMs).toBe(800);
  });

  it('returns improved stats at level 2', () => {
    const stats = getTowerStatsForLevel('single', 2);
    expect(stats).not.toBeNull();
    expect(stats!.damage).toBe(20 + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL);
    expect(stats!.range).toBeCloseTo(3 + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL);
    expect(stats!.attackCooldownMs).toBe(800 - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL);
  });

  it('returns max improved stats at level 3', () => {
    const stats = getTowerStatsForLevel('single', 3);
    expect(stats).not.toBeNull();
    expect(stats!.damage).toBe(20 + TowerUpgradeBalance.DAMAGE_INCREASE_PER_LEVEL * 2);
    expect(stats!.range).toBeCloseTo(3 + TowerUpgradeBalance.RANGE_INCREASE_PER_LEVEL * 2);
    expect(stats!.attackCooldownMs).toBe(800 - TowerUpgradeBalance.COOLDOWN_REDUCTION_PER_LEVEL * 2);
  });

  it('returns null for non-existent level', () => {
    expect(getTowerStatsForLevel('single', 0)).toBeNull();
    expect(getTowerStatsForLevel('single', TowerUpgradeBalance.MAX_LEVEL + 1)).toBeNull();
  });

  it('splash tower level 1 includes splash radius', () => {
    const stats = getTowerStatsForLevel('splash', 1);
    expect(stats).not.toBeNull();
    expect(stats!.splashRadius).toBe(1.5);
  });

  it('splash tower level 3 preserves splash radius', () => {
    const stats = getTowerStatsForLevel('splash', 3);
    expect(stats).not.toBeNull();
    expect(stats!.splashRadius).toBe(1.5);
  });
});

describe('tower total invested gold', () => {
  it('level 1 has zero upgrade investment', () => {
    expect(getTotalInvestedGold('single', 1)).toBe(0);
  });

  it('level 2 includes level 2 upgrade cost', () => {
    expect(getTotalInvestedGold('single', 2)).toBe(TowerUpgradeBalance.LEVEL_2_COST_GOLD);
  });

  it('level 3 includes both upgrade costs', () => {
    expect(getTotalInvestedGold('single', 3)).toBe(
      TowerUpgradeBalance.LEVEL_2_COST_GOLD + TowerUpgradeBalance.LEVEL_3_COST_GOLD,
    );
  });
});

describe('tower sell value', () => {
  it('level 1 sell value is 50% of build cost', () => {
    const buildCost = 50;
    expect(getSellValue('single', 1, buildCost)).toBe(Math.floor(buildCost * 0.5));
  });

  it('level 2 sell value includes upgrade cost', () => {
    const buildCost = 50;
    const totalInvested = buildCost + TowerUpgradeBalance.LEVEL_2_COST_GOLD;
    expect(getSellValue('single', 2, buildCost)).toBe(Math.floor(totalInvested * 0.5));
  });

  it('level 3 sell value includes all costs', () => {
    const buildCost = 50;
    const totalInvested =
      buildCost + TowerUpgradeBalance.LEVEL_2_COST_GOLD + TowerUpgradeBalance.LEVEL_3_COST_GOLD;
    expect(getSellValue('single', 3, buildCost)).toBe(Math.floor(totalInvested * 0.5));
  });
});

describe('tower upgrade config completeness', () => {
  it('single target has exactly MAX_LEVEL entries', () => {
    expect(TOWER_UPGRADE_CONFIG.single.levels).toHaveLength(TowerUpgradeBalance.MAX_LEVEL);
  });

  it('splash has exactly MAX_LEVEL entries', () => {
    expect(TOWER_UPGRADE_CONFIG.splash.levels).toHaveLength(TowerUpgradeBalance.MAX_LEVEL);
  });

  it('all level entries have sequential levels starting at 1', () => {
    for (const towerType of ['single', 'splash'] as const) {
      const config = TOWER_UPGRADE_CONFIG[towerType];
      config.levels.forEach((entry, index) => {
        expect(entry.level).toBe(index + 1);
      });
    }
  });

  it('level 1 upgrade cost is zero for all tower types', () => {
    for (const towerType of ['single', 'splash'] as const) {
      const config = TOWER_UPGRADE_CONFIG[towerType];
      expect(config.levels[0].upgradeCostGold).toBe(0);
    }
  });

  it('upgrade costs are positive for levels above 1', () => {
    for (const towerType of ['single', 'splash'] as const) {
      const config = TOWER_UPGRADE_CONFIG[towerType];
      for (const entry of config.levels.slice(1)) {
        expect(entry.upgradeCostGold).toBeGreaterThan(0);
      }
    }
  });

  it('max level in config matches max level constant', () => {
    for (const towerType of ['single', 'splash'] as const) {
      expect(TOWER_UPGRADE_CONFIG[towerType].maxLevel).toBe(TowerUpgradeBalance.MAX_LEVEL);
    }
  });
});
