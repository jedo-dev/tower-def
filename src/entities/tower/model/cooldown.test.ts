import { describe, expect, it } from 'vitest';
import {
  canTowerAttack,
  consumeTowerAttack,
  createInitialTowerCombatRuntime,
  tickTowerCooldown,
} from './cooldown';
import { TOWER_COMBAT_STATS_BY_TYPE, type TowerEntity } from './types';

function createTower(overrides?: Partial<TowerEntity>): TowerEntity {
  return {
    id: 'tower:archer:0',
    type: 'archer',
    cost: 100,
    position: { x: 0, y: 0 },
    combatStats: TOWER_COMBAT_STATS_BY_TYPE.archer,
    ...overrides,
  };
}

describe('tower cooldown', () => {
  it('allows attack initially', () => {
    const tower = createTower();
    const runtime = createInitialTowerCombatRuntime();

    expect(canTowerAttack(tower, runtime)).toBe(true);
  });

  it('puts tower on cooldown after attack consume', () => {
    const tower = createTower();
    const runtime = createInitialTowerCombatRuntime();
    const nextRuntime = consumeTowerAttack(tower, runtime);

    expect(nextRuntime.attackCooldownRemainingMs).toBe(
      tower.combatStats.attackCooldownMs,
    );
    expect(canTowerAttack(tower, nextRuntime)).toBe(false);
  });

  it('reduces cooldown over time and restores attack readiness', () => {
    const tower = createTower();
    const consumedRuntime = consumeTowerAttack(tower, createInitialTowerCombatRuntime());
    const halfwayRuntime = tickTowerCooldown(
      consumedRuntime,
      Math.floor(tower.combatStats.attackCooldownMs / 2),
    );
    const finishedRuntime = tickTowerCooldown(
      halfwayRuntime,
      tower.combatStats.attackCooldownMs,
    );

    expect(halfwayRuntime.attackCooldownRemainingMs).toBeGreaterThan(0);
    expect(canTowerAttack(tower, halfwayRuntime)).toBe(false);
    expect(finishedRuntime.attackCooldownRemainingMs).toBe(0);
    expect(canTowerAttack(tower, finishedRuntime)).toBe(true);
  });
});
