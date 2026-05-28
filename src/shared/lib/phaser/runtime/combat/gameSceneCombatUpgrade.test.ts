import { describe, expect, it } from 'vitest';
import type { CreepEntity } from '../../../../../entities/creep';
import {
  canAffordUpgrade,
  createInitialTowerCombatRuntime,
  getTowerStatsForLevel,
  getUpgradeCost,
  selectTowerTarget,
  canTowerAttack,
  consumeTowerAttack,
  tickTowerCooldown,
  type TowerEntity,
} from '../../../../../entities/tower';
import { spendGold, type PlayerResources } from '../../../../../entities/player-resources';

function createTestTower(overrides?: Partial<TowerEntity>): TowerEntity {
  return {
    id: 'tower:test:0',
    type: 'archer',
    cost: 50,
    position: { x: 5, y: 5 },
    level: 1,
    combatStats: getTowerStatsForLevel('archer', 1)!,
    ...overrides,
  };
}

function createTestCreep(overrides?: Partial<CreepEntity>): CreepEntity {
  return {
    id: 'creep:0',
    type: 'basic',
    hp: 100,
    lifeState: 'alive',
    speed: 1,
    status: 'alive',
    position: { x: 7, y: 5 },
    pathIndex: 0,
    ...overrides,
  };
}

function simulateUpgrade(
  tower: TowerEntity,
  resources: PlayerResources,
): { tower: TowerEntity; resources: PlayerResources; success: boolean } {
  const check = canAffordUpgrade(tower.type, tower.level, resources.gold);
  if (!check.allowed) {
    return { tower, resources, success: false };
  }

  const cost = getUpgradeCost(tower.type, tower.level);
  if (cost === null) {
    return { tower, resources, success: false };
  }

  const spendResult = spendGold(resources, cost);
  if (!spendResult.spent) {
    return { tower, resources, success: false };
  }

  const nextLevel = tower.level + 1;
  const nextStats = getTowerStatsForLevel(tower.type, nextLevel);
  if (!nextStats) {
    return { tower, resources, success: false };
  }

  return {
    tower: {
      ...tower,
      level: nextLevel,
      combatStats: { ...nextStats },
    },
    resources: spendResult.resources,
    success: true,
  };
}

describe('upgrade tower stats applied to entity', () => {
  it('level 1 archer has base stats', () => {
    const tower = createTestTower();
    expect(tower.level).toBe(1);
    expect(tower.combatStats.damage).toBe(20);
    expect(tower.combatStats.range).toBe(3);
    expect(tower.combatStats.attackCooldownMs).toBe(800);
  });

  it('upgrade to level 2 increases damage', () => {
    const tower = createTestTower();
    const resources: PlayerResources = { gold: 100, lives: 20 };
    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.tower.level).toBe(2);
    expect(result.tower.combatStats.damage).toBeGreaterThan(tower.combatStats.damage);
    expect(result.tower.combatStats.damage).toBe(30);
  });

  it('upgrade to level 2 increases range', () => {
    const tower = createTestTower();
    const resources: PlayerResources = { gold: 100, lives: 20 };
    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.tower.combatStats.range).toBeGreaterThan(tower.combatStats.range);
    expect(result.tower.combatStats.range).toBeCloseTo(3.2);
  });

  it('upgrade to level 2 reduces cooldown', () => {
    const tower = createTestTower();
    const resources: PlayerResources = { gold: 100, lives: 20 };
    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.tower.combatStats.attackCooldownMs).toBeLessThan(tower.combatStats.attackCooldownMs);
    expect(result.tower.combatStats.attackCooldownMs).toBe(750);
  });

  it('upgrade to level 3 further improves stats', () => {
    let tower = createTestTower();
    let resources: PlayerResources = { gold: 200, lives: 20 };

    const r1 = simulateUpgrade(tower, resources);
    tower = r1.tower;
    resources = r1.resources;

    const r2 = simulateUpgrade(tower, resources);
    tower = r2.tower;

    expect(tower.level).toBe(3);
    expect(tower.combatStats.damage).toBe(40);
    expect(tower.combatStats.range).toBeCloseTo(3.4);
    expect(tower.combatStats.attackCooldownMs).toBe(700);
  });
});

describe('upgrade gold deduction', () => {
  it('gold is deducted exactly once per upgrade', () => {
    const tower = createTestTower();
    const initialGold = 100;
    const resources: PlayerResources = { gold: initialGold, lives: 20 };
    const upgradeCost = getUpgradeCost(tower.type, tower.level)!;

    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.resources.gold).toBe(initialGold - upgradeCost);
  });

  it('upgrade fails when gold is insufficient', () => {
    const tower = createTestTower();
    const resources: PlayerResources = { gold: 5, lives: 20 };

    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(false);
    expect(result.resources.gold).toBe(5);
    expect(result.tower.level).toBe(1);
  });

  it('sequential upgrades deduct correct total gold', () => {
    let tower = createTestTower();
    let resources: PlayerResources = { gold: 500, lives: 20 };
    const initialGold = resources.gold;

    const cost1 = getUpgradeCost(tower.type, 1)!;
    const r1 = simulateUpgrade(tower, resources);
    tower = r1.tower;
    resources = r1.resources;

    const cost2 = getUpgradeCost(tower.type, 2)!;
    const r2 = simulateUpgrade(tower, resources);
    tower = r2.tower;
    resources = r2.resources;

    expect(tower.level).toBe(3);
    expect(resources.gold).toBe(initialGold - cost1 - cost2);
  });

  it('upgrade at max level is rejected', () => {
    const tower = createTestTower({ level: 3 });
    const resources: PlayerResources = { gold: 1000, lives: 20 };

    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(false);
    expect(result.resources.gold).toBe(1000);
    expect(result.tower.level).toBe(3);
  });
});

describe('upgraded stats affect combat', () => {
  it('upgraded tower reaches farther creeps', () => {
    const baseTower = createTestTower();
    const farCreep = createTestCreep({ position: { x: 8.2, y: 5 } });

    const baseTarget = selectTowerTarget(baseTower, [farCreep]);

    const upgradeResult = simulateUpgrade(baseTower, { gold: 100, lives: 20 });
    const upgradedTower = upgradeResult.tower;
    const upgradedTarget = selectTowerTarget(upgradedTower, [farCreep]);

    expect(baseTarget).toBeNull();
    expect(upgradedTarget).not.toBeNull();
    expect(upgradedTarget?.id).toBe('creep:0');
  });

  it('upgraded tower cooldown allows faster attacks', () => {
    const baseTower = createTestTower();
    const upgradedResult = simulateUpgrade(baseTower, { gold: 100, lives: 20 });
    const upgradedTower = upgradedResult.tower;

    const baseRuntime = createInitialTowerCombatRuntime();
    const upgradedRuntime = createInitialTowerCombatRuntime();

    const baseAfterAttack = consumeTowerAttack(baseTower, baseRuntime);
    const upgradedAfterAttack = consumeTowerAttack(upgradedTower, upgradedRuntime);

    expect(baseAfterAttack.attackCooldownRemainingMs).toBe(800);
    expect(upgradedAfterAttack.attackCooldownRemainingMs).toBe(750);

    const tickMs = 750;
    const baseAfterTick = tickTowerCooldown(baseAfterAttack, tickMs);
    const upgradedAfterTick = tickTowerCooldown(upgradedAfterAttack, tickMs);

    expect(canTowerAttack(baseTower, baseAfterTick)).toBe(false);
    expect(canTowerAttack(upgradedTower, upgradedAfterTick)).toBe(true);
  });

  it('upgraded damage kills creep in fewer hits', () => {
    const baseTower = createTestTower();
    const upgradeResult = simulateUpgrade(baseTower, { gold: 100, lives: 20 });
    const upgradedTower = upgradeResult.tower;

    const creepHp = 50;

    let baseHits = 0;
    let remainingHp = creepHp;
    while (remainingHp > 0) {
      remainingHp -= baseTower.combatStats.damage;
      baseHits++;
    }

    let upgradedHits = 0;
    remainingHp = creepHp;
    while (remainingHp > 0) {
      remainingHp -= upgradedTower.combatStats.damage;
      upgradedHits++;
    }

    expect(upgradedHits).toBeLessThan(baseHits);
    expect(baseTower.combatStats.damage).toBeLessThan(upgradedTower.combatStats.damage);
  });
});

describe('splash tower upgrade', () => {
  it('splash tower upgrade preserves splash radius', () => {
    const tower = createTestTower({
      type: 'splash',
      combatStats: getTowerStatsForLevel('splash', 1)!,
    });
    const resources: PlayerResources = { gold: 100, lives: 20 };
    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.tower.combatStats.splashRadius).toBe(1.5);
  });

  it('splash tower upgrade increases damage', () => {
    const tower = createTestTower({
      type: 'splash',
      combatStats: getTowerStatsForLevel('splash', 1)!,
    });
    const resources: PlayerResources = { gold: 100, lives: 20 };
    const result = simulateUpgrade(tower, resources);

    expect(result.success).toBe(true);
    expect(result.tower.combatStats.damage).toBe(28);
  });
});
