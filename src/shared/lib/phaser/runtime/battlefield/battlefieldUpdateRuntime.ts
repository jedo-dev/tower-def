import {
  removeDeadCreepsFromActiveWave,
  updateCreepHitFeedback,
  updateDamageNumbers,
  updateImpactEffects,
  updateProjectiles,
  updateTowerCombat,
  type CombatRuntimeConfig,
  type CombatRuntimeDependencies,
} from '../combat/gameSceneCombatRuntime';
import {
  moveCreepsAlongPath,
  type MovementRuntimeConfig,
  type MovementRuntimeDeps,
  type MovementRuntimeState,
} from '../movement/gameSceneMovementRuntime';
import type { BattlefieldRenderState } from './battlefieldRenderState';

/**
 * Per-field wiring for the frame update pipeline. The scene owns one context
 * per battlefield; the differences between the player and opponent fields
 * (economy targets, duel-state mirroring, movement source) live in the deps.
 */
export type BattlefieldUpdateContext = {
  field: BattlefieldRenderState;
  combatDeps: CombatRuntimeDependencies;
  movementDeps: MovementRuntimeDeps;
  getMovementState: () => MovementRuntimeState;
  afterFieldMutated: () => void;
};

export function moveBattlefieldCreeps(
  context: BattlefieldUpdateContext,
  config: MovementRuntimeConfig,
  deltaMs: number,
): void {
  if (context.field.creeps.length === 0) {
    return;
  }

  moveCreepsAlongPath(context.getMovementState(), context.movementDeps, config, deltaMs);
  context.afterFieldMutated();
}

export function updateBattlefieldTowerCombat(
  context: BattlefieldUpdateContext,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (context.field.towers.length === 0 || context.field.creeps.length === 0) {
    return;
  }

  updateTowerCombat(context.field, context.combatDeps, config, deltaMs);
  context.afterFieldMutated();
}

export function updateBattlefieldCreepHitFeedback(
  context: BattlefieldUpdateContext,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  updateCreepHitFeedback(context.field.creeps, config, deltaMs);
}

export function removeDeadBattlefieldCreeps(
  context: BattlefieldUpdateContext,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  context.field.creeps = removeDeadCreepsFromActiveWave(
    context.field.creeps,
    deltaMs,
    config.creepDeathFadeDurationMs,
  );
  context.afterFieldMutated();
}

export function updateBattlefieldProjectiles(
  context: BattlefieldUpdateContext,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (context.field.projectiles.length === 0) {
    return;
  }

  updateProjectiles(context.field, context.combatDeps, config, deltaMs);
  context.afterFieldMutated();
}

export function updateBattlefieldImpactEffects(
  context: BattlefieldUpdateContext,
  _config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (context.field.impactEffects.length === 0) {
    return;
  }

  updateImpactEffects(context.field, deltaMs);
  context.afterFieldMutated();
}

export function updateBattlefieldDamageNumbers(
  context: BattlefieldUpdateContext,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (context.field.damageNumbers.length === 0) {
    return;
  }

  updateDamageNumbers(context.field, config, deltaMs);
  context.afterFieldMutated();
}
