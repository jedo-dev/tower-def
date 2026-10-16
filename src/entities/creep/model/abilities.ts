import { CREATURE_ABILITY_BALANCE } from '../../../shared/constants/creatureAbilities';
import { EffectId } from '../../../shared/types/content-ids';
import type { CreatureAbilities } from '../../../shared/types/creatureAbilities';
import { getActiveEffects } from './effectTicks';
import type { CreepAbilityRuntime, CreepEntity } from './types';

// Runtime rules of the creature abilities that are not part of the damage
// path: spawn counters, invisibility, regeneration, shield recharge, speed
// boosts, effect resistance and leak weight. A creep without `abilities`
// takes the early return everywhere and behaves exactly as before.

/**
 * The counters a freshly spawned creep needs for its abilities. `routeDistance`
 * is the length of the route it spawns on, in cells.
 */
export function createCreepAbilityRuntime(
  abilities: CreatureAbilities | undefined,
  routeDistance: number,
): CreepAbilityRuntime {
  if (abilities === undefined) {
    return {};
  }

  return {
    ...(abilities.startInvisibleMs === undefined
      ? {}
      : { invisibleRemainingMs: abilities.startInvisibleMs }),
    ...(abilities.shieldHp === undefined ? {} : { shieldHp: abilities.shieldHp, msSinceDamage: 0 }),
    ...(abilities.speedBoostLastRouteShare === undefined
      ? {}
      : { routeDistanceAtSpawn: routeDistance }),
  };
}

/** Still inside its spawn invisibility: towers can neither aim at nor splash it. */
export function isCreepHidden(creep: Pick<CreepEntity, 'invisibleRemainingMs'>): boolean {
  return (creep.invisibleRemainingMs ?? 0) > 0;
}

function isPoisoned(creep: CreepEntity): boolean {
  for (const effect of getActiveEffects(creep)) {
    if (effect.id === EffectId.POISON) {
      return true;
    }
  }
  return false;
}

function tickRegeneration(creep: CreepEntity, abilities: CreatureAbilities, deltaMs: number): void {
  const regenPerSecond = abilities.healthRegenPerSecond;
  if (regenPerSecond === undefined || regenPerSecond <= 0) {
    return;
  }
  const maxHp = creep.maxHp ?? creep.hp;
  if (creep.hp >= maxHp) {
    return;
  }
  const pausedByPoison =
    abilities.regenPausedByPoison ?? CREATURE_ABILITY_BALANCE.defaultRegenPausedByPoison;
  if (pausedByPoison && isPoisoned(creep)) {
    return;
  }
  creep.hp = Math.min(maxHp, creep.hp + (regenPerSecond * deltaMs) / 1000);
}

function tickShieldRecharge(creep: CreepEntity, abilities: CreatureAbilities, deltaMs: number) {
  const shieldMax = abilities.shieldHp;
  const rechargeMs = abilities.shieldRechargeMs;
  if (shieldMax === undefined || rechargeMs === undefined) {
    return;
  }
  const msSinceDamage = (creep.msSinceDamage ?? 0) + deltaMs;
  creep.msSinceDamage = msSinceDamage;
  if (msSinceDamage >= rechargeMs && (creep.shieldHp ?? 0) < shieldMax) {
    creep.shieldHp = shieldMax;
  }
}

/**
 * Advances the ability counters of one living creep by `deltaMs`, in place
 * (like movement, nothing is allocated): spawn invisibility runs out,
 * regeneration heals and the shield refills once it went `shieldRechargeMs`
 * without damage.
 */
export function tickCreepAbilities(creep: CreepEntity, deltaMs: number): void {
  const abilities = creep.abilities;
  if (abilities === undefined || deltaMs <= 0 || creep.status !== 'alive') {
    return;
  }
  if (creep.invisibleRemainingMs !== undefined && creep.invisibleRemainingMs > 0) {
    creep.invisibleRemainingMs = Math.max(0, creep.invisibleRemainingMs - deltaMs);
  }
  tickRegeneration(creep, abilities, deltaMs);
  tickShieldRecharge(creep, abilities, deltaMs);
}

/**
 * Speed scale from the creature's own abilities: the low-health boost, the
 * route-end boost and the second life's multiplier, multiplied together.
 */
export function getAbilitySpeedMultiplier(creep: CreepEntity): number {
  const abilities = creep.abilities;
  if (abilities === undefined) {
    return 1;
  }

  let multiplier = 1;
  const lowHealth = abilities.speedBoostBelowHpShare;
  if (lowHealth !== undefined && creep.hp <= (creep.maxHp ?? creep.hp) * lowHealth.hpShare) {
    multiplier *= lowHealth.speedMultiplier;
  }

  const routeEnd = abilities.speedBoostLastRouteShare;
  const routeLength = creep.routeDistanceAtSpawn;
  if (routeEnd !== undefined && routeLength !== undefined && routeLength > 0) {
    const remaining = creep.remainingRouteDistance ?? routeLength;
    if (remaining <= routeLength * routeEnd.routeShare) {
      multiplier *= routeEnd.speedMultiplier;
    }
  }

  if (creep.isOnSecondLife === true && abilities.secondLife !== undefined) {
    multiplier *=
      abilities.secondLife.speedMultiplier ??
      CREATURE_ABILITY_BALANCE.defaultSecondLifeSpeedMultiplier;
  }

  return multiplier;
}

/**
 * Multiplier (0..1) the creep applies to an incoming effect; 0 means immune.
 * A second life with `immuneToChill` is immune to chill.
 */
export function getEffectResistanceMultiplier(creep: CreepEntity, effectId: EffectId): number {
  const abilities = creep.abilities;
  if (abilities === undefined) {
    return CREATURE_ABILITY_BALANCE.neutralMultiplier;
  }
  if (
    effectId === EffectId.CHILL &&
    creep.isOnSecondLife === true &&
    abilities.secondLife?.immuneToChill === true
  ) {
    return 0;
  }
  return abilities.effectResistance?.[effectId] ?? CREATURE_ABILITY_BALANCE.neutralMultiplier;
}

/** Lives one leak of this creep takes. */
export function getCreepLeakLives(creep: Pick<CreepEntity, 'abilities'>): number {
  return creep.abilities?.leakLivesTaken ?? CREATURE_ABILITY_BALANCE.defaultLeakLivesTaken;
}
