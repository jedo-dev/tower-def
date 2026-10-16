import {
  getTowerCenter,
  getTowerKillBonusGold,
  getTowerOnHitEffects,
} from '../../../../entities/tower';
import Phaser from 'phaser';
import { isCreepDead, type ApplyEffectInput, type CreepEntity } from '../../../../entities/creep';
import { getKillGoldPenalty } from '../../../../entities/duel-match';
import {
  TOWER_BONE_ARCHER_EFFECT_FRAMES,
  TOWER_SPRITE_KEYS,
} from '../../../../shared/constants/sprites';
import {
  CREEP_EFFECT_TINTS,
  IMPACT_EFFECT_SPLASH_TINT,
  PROJECTILE_SPLASH_TINT,
} from '../../scenes/gameScene.constants';
import { EffectId, type TowerTypeId } from '../../../../shared/types/content-ids';
import type { GridPosition } from '../../../../shared/types/pathfinding';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import { CreepSoundSlot, TowerSoundSlot } from '../../../../shared/types/sound-ids';
import type { GameSoundRouter } from '../audio/gameSoundRouting';
import type {
  CreepRenderState,
  DamageNumberState,
  ImpactEffectState,
  ProjectileState,
  TowerRenderState,
} from '../../scenes/gameScene.types';
import {
  createBattlefieldRenderState,
  type BattlefieldRenderState,
} from '../battlefield/battlefieldRenderState';
import {
  destroyCreepRenderState,
  refreshCreepEffectVisuals,
  resolveCreepRestingTint,
} from './creepEffectVisuals';
import { getCreepDeathAnimationKey } from '../animation/creepFacing';
import {
  applyTowerEffect,
  resolveTowerAttacks,
  tickFieldCreepEffects,
  type DamageNumberSource,
  type TowerCombatHooks,
} from './towerCombatCore';

export type CombatRuntimeConfig = {
  archerProjectileVisualMode: 'projectile' | 'attackEffect';
  creepBaseColor: number;
  creepHitFlashColor: number;
  creepHitFlashDurationMs: number;
  creepDeathFadeDurationMs: number;
  /** How long the death row is given before the sprite is destroyed. */
  creepDeathAnimationDurationMs: number;
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
  /** Fixed cues (economy, status effects); tower and creature sounds go through `soundRouter`. */
  playSound: (soundId: SoundId) => void;
  /** Resolves tower and creature sounds through the race sound profiles. */
  soundRouter: GameSoundRouter;
  /**
   * Pays the kill bounty to the side that owns this battlefield. Both sides
   * wire it to the shared duel-match bounty rule. `bonusGold` is the killing
   * tower's aura kill bonus (`goldPerKill`); 0 or absent for most kills.
   */
  awardKillBounty: (bonusGold?: number) => void;
  /**
   * Notes the kill for the round settle (a sent creep's death earns its sender
   * creature experience). Absent where nothing settles a duel round.
   */
  recordCreepDeath?: (creep: CreepEntity) => void;
  /**
   * Charges the side that owns this battlefield a creature's kill penalty
   * (`killGoldPenaltyToDefender`), never below 0 gold. Called only when the
   * killed creature carries one.
   */
  chargeKillPenalty?: (penaltyGold: number) => void;
  onHudChanged: () => void;
};

function handleCreepKill(
  deps: CombatRuntimeDependencies,
  creep: CreepRenderState,
  killer: TowerRenderState | undefined,
): void {
  deps.awardKillBounty(killer ? getTowerKillBonusGold(killer.entity) : 0);
  deps.recordCreepDeath?.(creep.entity);
  const penaltyGold = getKillGoldPenalty(creep.entity);
  if (penaltyGold > 0) {
    deps.chargeKillPenalty?.(penaltyGold);
  }
  deps.soundRouter.playCreepSound(creep, CreepSoundSlot.DEATH);
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
  const size = isSplash
    ? config.projectileDisplaySizePx * 1.7
    : config.projectileDisplaySizePx * 1.25;
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

function spawnProjectileFeedback(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  target: CreepRenderState,
  isSplash: boolean,
): void {
  const fromCenter = deps.toCellCenter(getTowerCenter(tower.entity));
  const targetCellCenter = deps.toCellCenter(target.entity.position);
  const targetOffsetPx = target.footprintCenterOffsetPx ?? 0;
  const toCenter = {
    x: targetCellCenter.x + targetOffsetPx,
    y: targetCellCenter.y + targetOffsetPx,
  };
  const lifetimeMs = Math.max(
    config.projectileMinLifetimeMs,
    Math.min(
      config.projectileMaxLifetimeMs,
      Math.round(tower.entity.combatStats.attackCooldownMs * 0.28),
    ),
  );
  const frame = isSplash
    ? TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile
    : config.archerProjectileVisualMode === 'projectile'
      ? TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile
      : TOWER_BONE_ARCHER_EFFECT_FRAMES.attackEffect;
  const effectSpriteKey = isSplash
    ? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER
    : tower.sprite.texture.key;

  const projectile = deps.scene.add.sprite(fromCenter.x, fromCenter.y, effectSpriteKey, frame);
  const displaySize = isSplash
    ? config.projectileDisplaySizePx * 1.6
    : config.projectileDisplaySizePx;
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

/**
 * Combat hooks for one rendered battlefield: hit flash, damage numbers,
 * effect repaint, sounds and projectiles. Cached per deps so a frame does not
 * allocate a fresh hooks object.
 */
type RenderCombatHooks = TowerCombatHooks<CreepRenderState, TowerRenderState>;

const renderCombatHooksCache = new WeakMap<
  CombatRuntimeDependencies,
  { battlefield: BattlefieldRenderState; config: CombatRuntimeConfig; hooks: RenderCombatHooks }
>();

function createRenderCombatHooks(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
): RenderCombatHooks {
  return {
    toCellCenter: deps.toCellCenter,
    onCreepHit: (creep) => {
      applyCreepHitFeedback(creep, config);
      deps.soundRouter.playCreepSound(creep, CreepSoundSlot.HIT);
    },
    onTargetStruck: (tower) => deps.soundRouter.playTowerSound(tower.entity, TowerSoundSlot.IMPACT),
    onDamageDealt: (position, damage, source) =>
      spawnDamageNumber(battlefield, deps, config, position, damage, source),
    onEffectApplied: (creep, effectId) => {
      refreshCreepEffectVisuals(deps.scene, creep, config.creepBaseColor);
      const soundId = EFFECT_APPLIED_SOUND_BY_EFFECT[effectId];
      if (soundId) {
        deps.playSound(soundId);
      }
    },
    onEffectsTicked: (creep) => refreshCreepEffectVisuals(deps.scene, creep, config.creepBaseColor),
    onCreepKilled: (creep, killer) => handleCreepKill(deps, creep, killer),
    onCreepRevived: (creep) => refreshCreepEffectVisuals(deps.scene, creep, config.creepBaseColor),
    onTowerFired: (tower, target, isSplashTower) => {
      if (isSplashTower) {
        deps.playSplashAttackAnimation(tower);
      } else {
        deps.playArcherAttackAnimation(tower);
      }
      spawnProjectileFeedback(battlefield, deps, config, tower, target, isSplashTower);
      deps.soundRouter.playTowerSound(tower.entity, TowerSoundSlot.ATTACK);
    },
  };
}

function getRenderCombatHooks(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
): RenderCombatHooks {
  const cached = renderCombatHooksCache.get(deps);
  if (cached && cached.battlefield === battlefield && cached.config === config) {
    return cached.hooks;
  }

  const hooks = createRenderCombatHooks(battlefield, deps, config);
  renderCombatHooksCache.set(deps, { battlefield, config, hooks });
  return hooks;
}

export function updateTowerCombat(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  resolveTowerAttacks(battlefield, getRenderCombatHooks(battlefield, deps, config), deltaMs);
}

/**
 * A shot is coloured by what it does: an effect tower fires in its effect
 * colour, a plain splash tower stays green.
 */
function resolveShotTint(
  towerType: TowerTypeId,
  isSplash: boolean,
  splashTint: number,
): number | undefined {
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
  // The battlefield only matters for damage numbers, which effects never spawn.
  return applyTowerEffect(
    creep,
    input,
    createRenderCombatHooks(createBattlefieldRenderState(), deps, config),
  );
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
  tickFieldCreepEffects(
    battlefield,
    getRenderCombatHooks(battlefield, deps, config),
    clampedDeltaMs,
  );
}

export function removeDeadCreepsFromActiveWave(
  activeCreeps: CreepRenderState[],
  deltaMs: number,
  deathFadeDurationMs: number,
  deathAnimationDurationMs = deathFadeDurationMs,
): CreepRenderState[] {
  const aliveCreeps: CreepRenderState[] = [];

  for (const creep of activeCreeps) {
    if (!isCreepDead(creep.entity)) {
      aliveCreeps.push(creep);
      continue;
    }

    // A sheet with a death row plays it out; a legacy strip has nothing to play,
    // so it keeps fading instead.
    if (creep.isDirectional) {
      if (!creep.isDeathAnimationPlaying) {
        creep.isDeathAnimationPlaying = true;
        creep.deathFadeRemainingMs = deathAnimationDurationMs;
        creep.sprite.play(getCreepDeathAnimationKey(creep.sprite), true);
      }

      creep.deathFadeRemainingMs = Math.max(0, creep.deathFadeRemainingMs - deltaMs);

      if (creep.deathFadeRemainingMs > 0) {
        aliveCreeps.push(creep);
        continue;
      }

      destroyCreepRenderState(creep);
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

export function updateImpactEffects(battlefield: BattlefieldRenderState, deltaMs: number): void {
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
