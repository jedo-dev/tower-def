import { getTowerCenter } from '../../../entities/tower';
import { TOWER_SHEET_EFFECT_FRAMES, TOWER_SPRITE_KEYS } from '../../../shared/constants/sprites';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import type { BattlefieldRenderState } from '../runtime/battlefield/battlefieldRenderState';
import type {
  CombatRuntimeConfig,
  CombatRuntimeDependencies,
} from '../runtime/combat/combatRuntimeTypes';
import { resolveShotTint } from '../runtime/combat/shotTint';
import { IMPACT_EFFECT_SPLASH_TINT, PROJECTILE_SPLASH_TINT } from '../scenes/gameScene.constants';
import type {
  CreepRenderState,
  ImpactEffectState,
  ProjectileState,
  TowerRenderState,
} from '../scenes/gameScene.types';
import { toCellCenterViaHooks } from './towerCombatReference';

// Verbatim copies of the combat feedback paths tower-def-5rh rewrote: every
// frame they rebuilt the projectile and impact effect lists and a fresh
// record per survivor. Tests run them next to the pooled, in-place versions
// on seeded scenarios. Damage numbers left this file in tower-def-0zc, when
// they moved from created-per-hit Text to pooled BitmapText labels.

export function referenceSpawnImpactEffect(
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
    ? TOWER_SHEET_EFFECT_FRAMES.attackEffect
    : TOWER_SHEET_EFFECT_FRAMES.projectile;
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

export function referenceSpawnProjectileFeedback(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  target: CreepRenderState,
  isSplash: boolean,
): void {
  const fromCenter = toCellCenterViaHooks(deps, getTowerCenter(tower.entity));
  const targetCellCenter = toCellCenterViaHooks(deps, target.entity.position);
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
    ? TOWER_SHEET_EFFECT_FRAMES.projectile
    : config.archerProjectileVisualMode === 'projectile'
      ? TOWER_SHEET_EFFECT_FRAMES.projectile
      : TOWER_SHEET_EFFECT_FRAMES.attackEffect;
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
    // The reference predates per-tower sheets; scenarios run on borrowed art.
    hasOwnArt: false,
    fromX: fromCenter.x,
    fromY: fromCenter.y,
    toX: toCenter.x,
    toY: toCenter.y,
    isSplash,
    remainingMs: lifetimeMs,
    maxLifetimeMs: lifetimeMs,
  });
}

export function referenceUpdateProjectiles(
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
      referenceSpawnImpactEffect(
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
      hasOwnArt: projectile.hasOwnArt,
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

export function referenceUpdateImpactEffects(
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
