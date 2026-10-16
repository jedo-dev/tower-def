import type Phaser from 'phaser';
import { getTowerCenter } from '../../../../entities/tower';
import { TOWER_SHEET_EFFECT_FRAMES, TOWER_SPRITE_KEYS } from '../../../../shared/constants/sprites';
import { PROJECTILE_SPLASH_TINT } from '../../scenes/gameScene.constants';
import type {
  CreepRenderState,
  ProjectileState,
  TowerRenderState,
} from '../../scenes/gameScene.types';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
import { spawnImpactEffect } from './impactEffects';
import {
  createRenderRecordPool,
  releasePooledRecord,
  takePooledRecord,
  type RenderRecordPool,
} from './renderRecordPool';
import { resolveShotTint } from './shotTint';
import type { PixelPoint } from './towerCombatTypes';

const projectilePool: RenderRecordPool<ProjectileState> = createRenderRecordPool();

/** Reused pixel points for a new shot; both are read before the next shot is spawned. */
const shotFromPx: PixelPoint = { x: 0, y: 0 };
const shotToPx: PixelPoint = { x: 0, y: 0 };

/** The module-wide projectile record pool; exposed so tests can check reuse. */
export function getProjectilePool(): RenderRecordPool<ProjectileState> {
  return projectilePool;
}

function resolveProjectileLifetimeMs(tower: TowerRenderState, config: CombatRuntimeConfig): number {
  return Math.max(
    config.projectileMinLifetimeMs,
    Math.min(
      config.projectileMaxLifetimeMs,
      Math.round(tower.entity.combatStats.attackCooldownMs * 0.28),
    ),
  );
}

function createProjectileSprite(
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  effectSpriteKey: string,
  isSplash: boolean,
  hasOwnArt: boolean,
): Phaser.GameObjects.Sprite {
  const frame =
    hasOwnArt || isSplash || config.archerProjectileVisualMode === 'projectile'
      ? TOWER_SHEET_EFFECT_FRAMES.projectile
      : TOWER_SHEET_EFFECT_FRAMES.attackEffect;
  const projectile = deps.scene.add.sprite(shotFromPx.x, shotFromPx.y, effectSpriteKey, frame);
  const displaySize = isSplash
    ? config.projectileDisplaySizePx * 1.6
    : config.projectileDisplaySizePx;
  projectile.setDisplaySize(displaySize, displaySize);
  projectile.setOrigin(0.5);
  projectile.setDepth(config.projectileRenderDepth);

  const tint = hasOwnArt
    ? undefined
    : resolveShotTint(tower.entity.type, isSplash, PROJECTILE_SPLASH_TINT);
  if (tint !== undefined) {
    projectile.setTint(tint);
  }
  return projectile;
}

/** The shot a tower fires at its target: flies from tower to creep, then leaves an impact. */
export function spawnProjectileFeedback(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  target: CreepRenderState,
  isSplash: boolean,
): void {
  deps.writeCellCenter(getTowerCenter(tower.entity), shotFromPx);
  deps.writeCellCenter(target.entity.position, shotToPx);
  const targetOffsetPx = target.footprintCenterOffsetPx ?? 0;
  shotToPx.x += targetOffsetPx;
  shotToPx.y += targetOffsetPx;
  const lifetimeMs = resolveProjectileLifetimeMs(tower, config);
  // A tower on its own sheet shoots its own shot; borrowed art shares the bone archer's, tinted.
  const hasOwnArt = tower.hasOwnArt === true;
  const effectSpriteKey =
    isSplash && !hasOwnArt ? TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER : tower.sprite.texture.key;
  const sprite = createProjectileSprite(deps, config, tower, effectSpriteKey, isSplash, hasOwnArt);

  const record = takePooledRecord(projectilePool);
  if (record === undefined) {
    battlefield.projectiles.push({
      sprite,
      towerType: tower.entity.type,
      effectSpriteKey,
      hasOwnArt,
      fromX: shotFromPx.x,
      fromY: shotFromPx.y,
      toX: shotToPx.x,
      toY: shotToPx.y,
      isSplash,
      remainingMs: lifetimeMs,
      maxLifetimeMs: lifetimeMs,
    });
    return;
  }

  record.sprite = sprite;
  record.towerType = tower.entity.type;
  record.effectSpriteKey = effectSpriteKey;
  record.hasOwnArt = hasOwnArt;
  record.fromX = shotFromPx.x;
  record.fromY = shotFromPx.y;
  record.toX = shotToPx.x;
  record.toY = shotToPx.y;
  record.isSplash = isSplash;
  record.remainingMs = lifetimeMs;
  record.maxLifetimeMs = lifetimeMs;
  battlefield.projectiles.push(record);
}

/**
 * Moves projectiles along their flight, turns landed ones into impact effects
 * and compacts the list in place (order kept), so a frame allocates nothing.
 */
export function updateProjectiles(
  battlefield: BattlefieldRenderState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  const projectiles = battlefield.projectiles;
  if (projectiles.length === 0) {
    return;
  }

  let writeIndex = 0;

  for (let readIndex = 0; readIndex < projectiles.length; readIndex += 1) {
    const projectile = projectiles[readIndex];
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
        projectile.hasOwnArt,
      );
      projectile.sprite.destroy();
      releasePooledRecord(projectilePool, projectile);
      continue;
    }

    const progress = 1 - remainingMs / projectile.maxLifetimeMs;
    const x = projectile.fromX + (projectile.toX - projectile.fromX) * progress;
    const y = projectile.fromY + (projectile.toY - projectile.fromY) * progress;
    projectile.sprite.setPosition(x, y);
    projectile.sprite.setAlpha(1 - progress * 0.35);
    projectile.remainingMs = remainingMs;
    projectiles[writeIndex] = projectile;
    writeIndex += 1;
  }

  projectiles.length = writeIndex;
}
