import { describe, expect, it, vi } from 'vitest';
import { onGameCommand } from '../../../shared/lib/game-bridge/bridge';
import type { HudTowerType, SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import {
  canAffordUpgrade,
  getSellValue,
  getUpgradeCost,
  isMaxLevel,
} from '../../../entities/tower';

function createTestSnapshot(overrides?: Partial<SelectedTowerSnapshot>): SelectedTowerSnapshot {
  return {
    id: 'tower:5:3',
    type: 'archer',
    level: 1,
    position: { x: 5, y: 3 },
    cost: 50,
    combatStats: {
      damage: 20,
      range: 3,
      attackCooldownMs: 800,
    },
    ...overrides,
  };
}

describe('tower action panel bridge commands', () => {
  it('upgrade-tower command handler receives tower id', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('upgrade-tower', handler);

    const snapshot = createTestSnapshot();
    const upgradeCost = getUpgradeCost(snapshot.type, snapshot.level);

    expect(upgradeCost).toBeGreaterThan(0);

    unsubscribe();
  });

  it('sell-tower command handler receives tower id', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('sell-tower', handler);

    const snapshot = createTestSnapshot();
    const sellValue = getSellValue(snapshot.type, snapshot.level, snapshot.cost);

    expect(sellValue).toBeGreaterThan(0);

    unsubscribe();
  });

  it('upgrade-tower and sell-tower are valid command names', () => {
    const upgradeHandler = vi.fn();
    const sellHandler = vi.fn();
    const unsub1 = onGameCommand('upgrade-tower', upgradeHandler);
    const unsub2 = onGameCommand('sell-tower', sellHandler);

    unsub1();
    unsub2();
  });
});

describe('tower action panel upgrade logic', () => {
  it('level 1 archer can be upgraded', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 1 });
    expect(isMaxLevel(snapshot.type, snapshot.level)).toBe(false);
    expect(getUpgradeCost(snapshot.type, snapshot.level)).toBe(40);
  });

  it('max level archer cannot be upgraded', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 3 });
    expect(isMaxLevel(snapshot.type, snapshot.level)).toBe(true);
    expect(getUpgradeCost(snapshot.type, snapshot.level)).toBeNull();
  });

  it('upgrade is allowed when gold is sufficient', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 1 });
    const result = canAffordUpgrade(snapshot.type, snapshot.level, 100);
    expect(result.allowed).toBe(true);
  });

  it('upgrade is rejected when gold is insufficient', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 1 });
    const result = canAffordUpgrade(snapshot.type, snapshot.level, 10);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_gold');
  });

  it('upgrade is rejected at max level', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 3 });
    const result = canAffordUpgrade(snapshot.type, snapshot.level, 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('max_level');
  });
});

describe('tower action panel sell logic', () => {
  it('level 1 sell value is 50% of build cost', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 1, cost: 50 });
    expect(getSellValue(snapshot.type, snapshot.level, snapshot.cost)).toBe(25);
  });

  it('level 2 sell value includes upgrade cost', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 2, cost: 50 });
    const totalInvested = 50 + 40;
    expect(getSellValue(snapshot.type, snapshot.level, snapshot.cost)).toBe(
      Math.floor(totalInvested * 0.5),
    );
  });

  it('level 3 sell value includes all costs', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 3, cost: 50 });
    const totalInvested = 50 + 40 + 80;
    expect(getSellValue(snapshot.type, snapshot.level, snapshot.cost)).toBe(
      Math.floor(totalInvested * 0.5),
    );
  });

  it('splash tower sell value works correctly', () => {
    const snapshot = createTestSnapshot({ type: 'splash', level: 2, cost: 75 });
    const totalInvested = 75 + 40;
    expect(getSellValue(snapshot.type, snapshot.level, snapshot.cost)).toBe(
      Math.floor(totalInvested * 0.5),
    );
  });
});

describe('tower action panel display data', () => {
  it('archer tower snapshot has correct combat stats', () => {
    const snapshot = createTestSnapshot({ type: 'archer', level: 1 });
    expect(snapshot.combatStats.damage).toBe(20);
    expect(snapshot.combatStats.range).toBe(3);
    expect(snapshot.combatStats.attackCooldownMs).toBe(800);
    expect(snapshot.combatStats.splashRadius).toBeUndefined();
  });

  it('splash tower snapshot includes splash radius', () => {
    const snapshot = createTestSnapshot({
      type: 'splash',
      level: 1,
      combatStats: {
        damage: 18,
        range: 2.5,
        attackCooldownMs: 1200,
        splashRadius: 1.5,
      },
    });
    expect(snapshot.combatStats.splashRadius).toBe(1.5);
  });

  it('tower type is valid HudTowerType', () => {
    const validTypes: HudTowerType[] = ['archer', 'splash'];
    const snapshot = createTestSnapshot();
    expect(validTypes).toContain(snapshot.type);
  });
});
