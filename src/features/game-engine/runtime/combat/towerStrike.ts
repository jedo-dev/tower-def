import {
  applyDamageToCreep,
  applyEffectToCreep,
  type ApplyEffectInput,
} from '../../../../entities/creep';
import {
  getTowerAttackKind,
  getTowerOnHitEffects,
  resolveTargetDamageMultiplier,
  type TowerOnHitEffect,
} from '../../../../entities/tower';
import { TowerAttackKind, type DamageType } from '../../../../shared/types/content-ids';
import { CreatureDamageShape } from '../../../../shared/types/creatureAbilities';
import type { CombatCreep, CombatTower, TowerCombatHooks } from './towerCombatTypes';

// One tower hit on one creep: per-target damage abilities, armor (inside
// applyDamageToCreep), on-hit effects and hit feedback. Every attack shape
// (single, splash, chain, extra targets, pierce, volley) lands through here.

/**
 * Single entry point for putting a tower effect on a creep. Returns false when
 * the application changed nothing (a weaker strongest-wins effect).
 */
export function applyTowerEffect<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  input: ApplyEffectInput,
  hooks: TowerCombatHooks<C, T>,
): boolean {
  const previousEntity = creep.entity;
  creep.entity = applyEffectToCreep(creep.entity, input);

  if (creep.entity === previousEntity) {
    return false;
  }

  hooks.onEffectApplied(creep, input.effectId);
  return true;
}

/** The effect input an authored on-hit entry applies; optional fields only when set. */
export function toApplyEffectInput(effect: TowerOnHitEffect): ApplyEffectInput {
  return {
    effectId: effect.effectId,
    magnitude: effect.magnitude,
    durationMs: effect.durationMs,
    maxStacks: effect.maxStacks,
    damageType: effect.damageType,
    ...(effect.armorKind === undefined ? {} : { armorKind: effect.armorKind }),
    ...(effect.damageKind === undefined ? {} : { damageScope: effect.damageKind }),
    ...(effect.freezeAtStacks === undefined ? {} : { freezeAtStacks: effect.freezeAtStacks }),
    ...(effect.freezeMs === undefined ? {} : { freezeMs: effect.freezeMs }),
  };
}

function applyOnHitEffects<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  hooks: TowerCombatHooks<C, T>,
): void {
  const onHitEffects =
    tower.entity.combatStats.onHitEffects ?? getTowerOnHitEffects(tower.entity.type);

  if (onHitEffects.length === 0 || creep.entity.status !== 'alive') {
    return;
  }

  for (const effect of onHitEffects) {
    applyTowerEffect(creep, toApplyEffectInput(effect), hooks);
  }
}

export type StrikeResult = { damageApplied: number; killed: boolean };

/**
 * How a tower's hits reach a creep, for the creature's incoming damage
 * multipliers: a splash or chain tower's hits by its kind, everything else
 * (single shots, extra targets, pierce, volley) as single-target.
 */
export function resolveTowerDamageShape(tower: CombatTower): CreatureDamageShape {
  const attackKind = getTowerAttackKind(tower.entity.type);
  if (attackKind === TowerAttackKind.SPLASH && (tower.entity.combatStats.splashRadius ?? 0) > 0) {
    return CreatureDamageShape.SPLASH;
  }
  return attackKind === TowerAttackKind.CHAIN
    ? CreatureDamageShape.CHAIN
    : CreatureDamageShape.SINGLE;
}

/**
 * Damages one creep with a tower hit of the tower's damage type (resolved once
 * per attack by the caller); `damage` is the shot's damage before per-target
 * abilities (air/ground, full health, large), which are applied here.
 */
export function strikeCreep<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  damage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): StrikeResult {
  const targetMultiplier = resolveTargetDamageMultiplier(
    tower.entity.combatStats.abilities,
    creep.entity,
  );
  const damageResult = applyDamageToCreep(
    creep.entity,
    damage * targetMultiplier,
    damageType,
    resolveTowerDamageShape(tower),
  );
  creep.entity = damageResult.creep;
  if (damageResult.revived === true) {
    hooks.onCreepRevived?.(creep);
  }
  applyOnHitEffects(tower, creep, hooks);
  hooks.onCreepHit(creep);
  return { damageApplied: damageResult.damageApplied, killed: damageResult.killed };
}

/**
 * A secondary hit (chain arc, extra target, pierce, volley): strikes, shows
 * its own damage number and pays out a kill credited to the tower.
 */
export function strikeAndReport<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  creep: C,
  damage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): StrikeResult {
  const result = strikeCreep(tower, creep, damage, damageType, hooks);
  hooks.onDamageDealt(creep.entity.position, Math.round(result.damageApplied), 'hit');

  if (result.killed) {
    hooks.onCreepKilled(creep, tower);
  }

  return result;
}
