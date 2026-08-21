import { TowerAttackKind } from '../../../../types/content-ids';
import { getTowerAttackKind, getTowerOnHitEffects } from '../../../../../entities/tower';
import Phaser from 'phaser';
import { addGold, type PlayerResources } from '../../../../../entities/player-resources';
import {
  applyDamageToCreep,
  applyEffectToCreep,
  isCreepDead,
  tickCreepEffects,
  type ApplyEffectInput,
} from '../../../../../entities/creep';
import { canTowerAttack, consumeTowerAttack, selectTowerTarget, tickTowerCooldown } from '../../../../../entities/tower';
import { ECONOMY_BALANCE } from '../../../../constants/economy';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { TOWER_BONE_ARCHER_EFFECT_FRAMES, TOWER_SPRITE_KEYS } from '../../../../constants/sprites';
import {
  CREEP_EFFECT_TINTS,
  IMPACT_EFFECT_SPLASH_TINT,
  PROJECTILE_SPLASH_TINT,
} from '../../scenes/gameScene.constants';
import { EffectId, type TowerTypeId } from '../../../../types/content-ids';
import type { GridPosition } from '../../../../types/pathfinding';
import type { SoundId } from '../../sound/audio.types';
import type {
  CreepRenderState,
  DamageNumberState,
  ImpactEffectState,
  ProjectileState,
  TowerRenderState,
} from '../../scenes/gameScene.types';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import {
  destroyCreepRenderState,
  refreshCreepEffectVisuals,
  resolveCreepRestingTint,
} from './creepEffectVisuals';

export type CombatRuntimeConfig = {
  archerProjectileVisualMode: 'projectile' | 'attackEffect';
  creepBaseColor: number;
  creepHitFlashColor: number;
  creepHitFlashDurationMs: number;
  creepDeathFadeDurationMs: number;
  projectileMinLifetimeMs: number;
  projectileMaxLifetimeMs: number;
  projectileDisplaySizePx: number;
  projectileRenderDepth: number;
  impactEffectLifetimeMs: number;
  impactEffectRenderDepth: number;
  damageNumbersEnabled: boolean;
  damageNumberLifetimeMs: number;
  damageNumberRisePx: number;
  damageNumberHitColor: string;
  damageNumberEffectColor: string;
  effectMaxSimulationDeltaMs: number;
};

export type CombatRuntimeDependencies = {
  scene: Phaser.Scene;
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  playArcherAttackAnimation: (tower: TowerRenderState) => void;
  playSplashAttackAnimation: (tower: TowerRenderState) => void;
  playSound: (soundId: SoundId) => void;
  getResources: () => PlayerResources;
  /** Applies the difficulty reward modifier; identity when not provided. */
  scaleReward?: (baseReward: number) => number;
  onGoldUpdated: (nextGold: number) => void;
  onHudChanged: () => void;
};

function handleCreepKill(deps: CombatRuntimeDependencies): void {
  const reward = deps.scaleReward?.(ECONOMY_BALANCE.creepKillRewardGold)
    ?? ECONOMY_BALANCE.creepKillRewardGold;
  const nextResources = addGold(deps.getResources(), reward);
  deps.onGoldUpdated(nextResources.gold);
  deps.playSound('combat.creep_death.basic');
  deps.playSound('economy.gold_gain');
  deps.onHudChanged();
}

function spawnImpactEffect(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  spriteKey: string,
  x: number,
  y: number,
  isSplash: boolean,
  towerType: TowerTypeId,
): void {
  const frame = isSplash
    ? TOWER_BONE_ARCHER_EFFECT_FRAMES.attackEffect
    : TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile;
  const effect = deps.scene.add.sprite(x, y, spriteKey, frame);
  const size = isSplash ? config.projectileDisplaySizePx * 1.7 : config.projectileDisplaySizePx * 1.25;
  effect.setDisplaySize(size, size);
  effect.setOrigin(0.5);
  effect.setDepth(config.impactEffectRenderDepth);

  const tint = resolveShotTint(towerType, isSplash, IMPACT_EFFECT_SPLASH_TINT);
  if (tint !== undefined) {
    effect.setTint(tint);
  }

  battlefield.impactEffects.push({
    sprite: effect,
    remainingMs: config.impactEffectLifetimeMs,
    maxLifetimeMs: config.impactEffectLifetimeMs,
  });
}

type DamageNumberSource = 'hit' | 'effect';

function spawnDamageNumber(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  position: GridPosition,
  damage: number,
  source: DamageNumberSource = 'hit',
): void {
  if (!config.damageNumbersEnabled) {
    return;
  }

  const center = deps.toCellCenter(position);
  const text = deps.scene.add.text(center.x, center.y - 10, `${damage}`, {
    fontFamily: 'Exo 2, Segoe UI, Tahoma, sans-serif',
    fontSize: source === 'effect' ? '10px' : '11px',
    color: source === 'effect' ? config.damageNumberEffectColor : config.damageNumberHitColor,
    stroke: '#1d2536',
    strokeThickness: 2,
  });
  text.setOrigin(0.5);

  battlefield.damageNumbers.push({
    text,
    startY: text.y,
    remainingMs: config.damageNumberLifetimeMs,
  });
}

function applyCreepHitFeedback(creep: CreepRenderState, config: CombatRuntimeConfig): void {
  creep.hitFlashRemainingMs = config.creepHitFlashDurationMs;
  creep.sprite.setTint(config.creepHitFlashColor);
}

function applyTowerOnHitEffects(
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  creep: CreepRenderState,
): void {
  const onHitEffects = tower.entity.combatStats.onHitEffects
    ?? getTowerOnHitEffects(tower.entity.type);

  if (onHitEffects.length === 0 || creep.entity.status !== 'alive') {
    return;
  }

  for (const effect of onHitEffects) {
    applyTowerEffectToCreep(deps, config, creep, {
      effectId: effect.effectId,
      magnitude: effect.magnitude,
      durationMs: effect.durationMs,
      maxStacks: effect.maxStacks,
    });
  }
}

function applySingleTargetDamage(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  targetRenderState: CreepRenderState,
): void {
  const damageResult = applyDamageToCreep(targetRenderState.entity, tower.entity.combatStats.damage);

  targetRenderState.entity = damageResult.creep;
  applyTowerOnHitEffects(deps, config, tower, targetRenderState);
  applyCreepHitFeedback(targetRenderState, config);
  deps.playSound('combat.creep_hit');
  spawnDamageNumber(
    battlefield,
    deps,
    config,
    targetRenderState.entity.position,
    Math.round(damageResult.damageApplied),
  );

  if (damageResult.killed) {
    handleCreepKill(deps);
  }
}

function applySplashDamage(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  targetRenderState: CreepRenderState,
): void {
  const splashRadius = tower.entity.combatStats.splashRadius ?? 1.5;
  const towerCenter = tower.entity.position;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;

  const creepsInSplashRadius = battlefield.creeps.filter((creep) => {
    if (creep.entity.status !== 'alive') {
      return false;
    }
    const creepCenter = deps.toCellCenter(creep.entity.position);
    const towerCenterPx = deps.toCellCenter(towerCenter);
    const distance = Math.hypot(creepCenter.x - towerCenterPx.x, creepCenter.y - towerCenterPx.y);
    return distance <= splashRadiusPx;
  });

  let totalDamageDealt = 0;
  for (const creep of creepsInSplashRadius) {
    const damageResult = applyDamageToCreep(creep.entity, tower.entity.combatStats.damage);
    creep.entity = damageResult.creep;
    applyTowerOnHitEffects(deps, config, tower, creep);
    applyCreepHitFeedback(creep, config);
    totalDamageDealt += damageResult.damageApplied;

    if (damageResult.killed) {
      handleCreepKill(deps);
    }
  }

  deps.playSound('combat.creep_hit');
  spawnDamageNumber(battlefield, deps, config, targetRenderState.entity.position, Math.round(totalDamageDealt));
}

function spawnProjectileFeedback(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  to: GridPosition,
  isSplash: boolean,
): void {
  const fromCenter = deps.toCellCenter(tower.entity.position);
  const toCenter = deps.toCellCenter(to);
  const lifetimeMs = Math.max(
    config.projectileMinLifetimeMs,
    Math.min(config.projectileMaxLifetimeMs, Math.round(tower.entity.combatStats.attackCooldownMs * 0.28)),
  );
  const frame = isSplash
    ? TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile
    : config.archerProjectileVisualMode === 'projectile'
      ? TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile
      : TOWER_BONE_ARCHER_EFFECT_FRAMES.attackEffect;
  const effectSpriteKey = isSplash ? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER : tower.sprite.texture.key;

  const projectile = deps.scene.add.sprite(fromCenter.x, fromCenter.y, effectSpriteKey, frame);
  const displaySize = isSplash ? config.projectileDisplaySizePx * 1.6 : config.projectileDisplaySizePx;
  projectile.setDisplaySize(displaySize, displaySize);
  projectile.setOrigin(0.5);
  projectile.setDepth(config.projectileRenderDepth);

  const tint = resolveShotTint(tower.entity.type, isSplash, PROJECTILE_SPLASH_TINT);
  if (tint !== undefined) {
    projectile.setTint(tint);
  }

  battlefield.projectiles.push({
    sprite: projectile,
    towerType: tower.entity.type,
    effectSpriteKey,
    fromX: fromCenter.x,
    fromY: fromCenter.y,
    toX: toCenter.x,
    toY: toCenter.y,
    isSplash,
    remainingMs: lifetimeMs,
    maxLifetimeMs: lifetimeMs,
  });
}

export function updateTowerCombat(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (battlefield.towers.length === 0 || battlefield.creeps.length === 0) {
    return;
  }

  const creepsForTargeting = battlefield.creeps.map((creep) => creep.entity);

  for (const tower of battlefield.towers) {
    tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

    if (!canTowerAttack(tower.entity, tower.runtime)) {
      continue;
    }

    const targetCreep = selectTowerTarget(tower.entity, creepsForTargeting);

    if (!targetCreep) {
      continue;
    }

    const targetRenderState = battlefield.creeps.find((creep) => creep.entity.id === targetCreep.id);

    if (!targetRenderState) {
      continue;
    }

    const isSplashTower = getTowerAttackKind(tower.entity.type) === TowerAttackKind.SPLASH;
    const splashRadius = tower.entity.combatStats.splashRadius ?? 0;

    if (isSplashTower && splashRadius > 0) {
      applySplashDamage(battlefield, deps, config, tower, targetRenderState);
    } else {
      applySingleTargetDamage(battlefield, deps, config, tower, targetRenderState);
    }

    tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
    if (isSplashTower) {
      deps.playSplashAttackAnimation(tower);
    } else {
      deps.playArcherAttackAnimation(tower);
    }
    spawnProjectileFeedback(battlefield, deps, config, tower, targetRenderState.entity.position, isSplashTower);
    deps.playSound(isSplashTower ? 'combat.tower_attack.splash' : 'combat.tower_attack.archer');
  }
}

/**
 * A shot is coloured by what it does: an effect tower fires in its effect
 * colour, a plain splash tower stays green.
 */
function resolveShotTint(towerType: TowerTypeId, isSplash: boolean, splashTint: number): number | undefined {
  const [firstEffect] = getTowerOnHitEffects(towerType);

  if (firstEffect) {
    return CREEP_EFFECT_TINTS[firstEffect.effectId];
  }

  return isSplash ? splashTint : undefined;
}

const EFFECT_APPLIED_SOUND_BY_EFFECT: Partial<Record<EffectId, SoundId>> = {
  [EffectId.CHILL]: 'combat.effect_applied.chill',
  [EffectId.POISON]: 'combat.effect_applied.poison',
  [EffectId.BURN]: 'combat.effect_applied.poison',
  [EffectId.STUN]: 'combat.effect_applied.stun',
};

/**
 * Single entry point for putting a tower effect on a creep: applies it, repaints
 * the creep and plays its stinger. The sound registry cooldown throttles the
 * stinger, so a splash hit on a dozen creeps stays one audible cue.
 */
export function applyTowerEffectToCreep(
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  creep: CreepRenderState,
  input: ApplyEffectInput,
): boolean {
  const previousEntity = creep.entity;
  creep.entity = applyEffectToCreep(creep.entity, input);

  // A weaker application of a strongest-wins effect changes nothing.
  if (creep.entity === previousEntity) {
    return false;
  }

  refreshCreepEffectVisuals(deps.scene, creep, config.creepBaseColor);

  const soundId = EFFECT_APPLIED_SOUND_BY_EFFECT[input.effectId];

  if (soundId) {
    deps.playSound(soundId);
  }

  return true;
}

/**
 * Advances status effects on every living creep and routes damage over time
 * through the same damage and reward path as a tower hit, so a poison kill
 * pays out exactly once.
 */
export function updateCreepEffects(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (battlefield.creeps.length === 0) {
    return;
  }

  const clampedDeltaMs = Math.min(deltaMs, config.effectMaxSimulationDeltaMs);

  for (const creep of battlefield.creeps) {
    if (creep.entity.status !== 'alive') {
      continue;
    }

    const tickResult = tickCreepEffects(creep.entity, clampedDeltaMs);

    if (tickResult.creep === creep.entity) {
      continue;
    }

    creep.entity = tickResult.creep;
    refreshCreepEffectVisuals(deps.scene, creep, config.creepBaseColor);

    if (tickResult.damage <= 0) {
      continue;
    }

    const damageResult = applyDamageToCreep(creep.entity, tickResult.damage, { ignoreArmor: true });
    creep.entity = damageResult.creep;
    spawnDamageNumber(
      battlefield,
      deps,
      config,
      creep.entity.position,
      Math.round(tickResult.damage),
      'effect',
    );

    if (damageResult.killed) {
      handleCreepKill(deps);
    }
  }
}

export function removeDeadCreepsFromActiveWave(
  activeCreeps: CreepRenderState[],
  deltaMs: number,
  deathFadeDurationMs: number,
): CreepRenderState[] {
  const aliveCreeps: CreepRenderState[] = [];

  for (const creep of activeCreeps) {
    if (!isCreepDead(creep.entity)) {
      aliveCreeps.push(creep);
      continue;
    }

    if (creep.deathFadeRemainingMs <= 0) {
      creep.deathFadeRemainingMs = deathFadeDurationMs;
    }

    creep.deathFadeRemainingMs = Math.max(0, creep.deathFadeRemainingMs - deltaMs);
    const alpha = creep.deathFadeRemainingMs / deathFadeDurationMs;
    creep.sprite.setAlpha(alpha);

    if (creep.deathFadeRemainingMs > 0) {
      aliveCreeps.push(creep);
      continue;
    }

    destroyCreepRenderState(creep);
  }

  return aliveCreeps;
}

export function updateProjectiles(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (battlefield.projectiles.length === 0) {
    return;
  }

  const nextProjectiles: ProjectileState[] = [];

  for (const projectile of battlefield.projectiles) {
    const remainingMs = projectile.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      spawnImpactEffect(
        battlefield,
        deps,
        config,
        projectile.effectSpriteKey,
        projectile.toX,
        projectile.toY,
        projectile.isSplash,
        projectile.towerType,
      );
      projectile.sprite.destroy();
      continue;
    }

    const progress = 1 - remainingMs / projectile.maxLifetimeMs;
    const x = projectile.fromX + (projectile.toX - projectile.fromX) * progress;
    const y = projectile.fromY + (projectile.toY - projectile.fromY) * progress;
    projectile.sprite.setPosition(x, y);
    projectile.sprite.setAlpha(1 - progress * 0.35);
    nextProjectiles.push({
      sprite: projectile.sprite,
      towerType: projectile.towerType,
      effectSpriteKey: projectile.effectSpriteKey,
      fromX: projectile.fromX,
      fromY: projectile.fromY,
      toX: projectile.toX,
      toY: projectile.toY,
      isSplash: projectile.isSplash,
      remainingMs,
      maxLifetimeMs: projectile.maxLifetimeMs,
    });
  }

  battlefield.projectiles = nextProjectiles;
}

export function updateImpactEffects(
  battlefield: BattlefieldRenderState,
  deltaMs: number,
): void {
  if (battlefield.impactEffects.length === 0) {
    return;
  }

  const nextEffects: ImpactEffectState[] = [];

  for (const effect of battlefield.impactEffects) {
    const remainingMs = effect.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      effect.sprite.destroy();
      continue;
    }

    effect.sprite.setAlpha(remainingMs / effect.maxLifetimeMs);
    nextEffects.push({
      sprite: effect.sprite,
      remainingMs,
      maxLifetimeMs: effect.maxLifetimeMs,
    });
  }

  battlefield.impactEffects = nextEffects;
}

export function updateDamageNumbers(
  battlefield: BattlefieldRenderState,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (battlefield.damageNumbers.length === 0) {
    return;
  }

  const next: DamageNumberState[] = [];

  for (const numberState of battlefield.damageNumbers) {
    const remainingMs = numberState.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      numberState.text.destroy();
      continue;
    }

    const progress = 1 - remainingMs / config.damageNumberLifetimeMs;
    numberState.text.setAlpha(1 - progress);
    numberState.text.setY(numberState.startY - config.damageNumberRisePx * progress);
    next.push({
      ...numberState,
      remainingMs,
    });
  }

  battlefield.damageNumbers = next;
}

export function updateCreepHitFeedback(
  activeCreeps: CreepRenderState[],
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  for (const creep of activeCreeps) {
    if (creep.hitFlashRemainingMs <= 0) {
      continue;
    }

    creep.hitFlashRemainingMs = Math.max(0, creep.hitFlashRemainingMs - deltaMs);

    // Restore what the creep should look like at rest: the dominant effect
    // tint while an effect runs, otherwise its own faction tint.
    const baseColor = resolveCreepRestingTint(creep, config.creepBaseColor);

    if (creep.hitFlashRemainingMs === 0) {
      creep.sprite.setTint(baseColor);
      continue;
    }

    const progress = creep.hitFlashRemainingMs / config.creepHitFlashDurationMs;
    const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(baseColor),
      Phaser.Display.Color.ValueToColor(config.creepHitFlashColor),
      100,
      Math.round(progress * 100),
    );
    creep.sprite.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
  }
}
