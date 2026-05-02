import type { TowerEntity } from './types';

export type TowerCombatRuntime = {
  attackCooldownRemainingMs: number;
};

export function createInitialTowerCombatRuntime(): TowerCombatRuntime {
  return {
    attackCooldownRemainingMs: 0,
  };
}

export function tickTowerCooldown(
  runtime: TowerCombatRuntime,
  deltaMs: number,
): TowerCombatRuntime {
  if (deltaMs <= 0) {
    return runtime;
  }

  return {
    ...runtime,
    attackCooldownRemainingMs: Math.max(0, runtime.attackCooldownRemainingMs - deltaMs),
  };
}

export function canTowerAttack(
  tower: TowerEntity,
  runtime: TowerCombatRuntime,
): boolean {
  if (tower.combatStats.attackCooldownMs <= 0) {
    return true;
  }

  return runtime.attackCooldownRemainingMs <= 0;
}

export function consumeTowerAttack(
  tower: TowerEntity,
  runtime: TowerCombatRuntime,
): TowerCombatRuntime {
  return {
    ...runtime,
    attackCooldownRemainingMs: tower.combatStats.attackCooldownMs,
  };
}
