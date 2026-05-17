import Phaser from 'phaser';
import { addGold } from '../../../../../entities/player-resources';
import { applyDamageToCreep, isCreepDead } from '../../../../../entities/creep';
import { canTowerAttack, consumeTowerAttack, selectTowerTarget, tickTowerCooldown } from '../../../../../entities/tower';
import { ECONOMY_BALANCE } from '../../../../constants/economy';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { TOWER_BONE_ARCHER_EFFECT_FRAMES, TOWER_SPRITE_KEYS } from '../../../../constants/sprites';
import type { GridPosition } from '../../../../types/pathfinding';
import type { SoundId } from '../../sound/audio.types';
import type {
  CreepRenderState,
  DamageNumberState,
  ImpactEffectState,
  ProjectileState,
  TowerRenderState,
} from '../../scenes/gameScene.types';

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
};

export type CombatRuntimeDependencies = {
  scene: Phaser.Scene;
  toCellCenter: (position: GridPosition) => { x: number; y: number };
  playArcherAttackAnimation: (tower: TowerRenderState) => void;
  playSplashAttackAnimation: (tower: TowerRenderState) => void;
  playSound: (soundId: SoundId) => void;
  onGoldUpdated: (nextGold: number) => void;
  onHudChanged: () => void;
};

export type CombatRuntimeState = {
  activeCreeps: CreepRenderState[];
  activeTowers: TowerRenderState[];
  activeProjectiles: ProjectileState[];
  activeImpactEffects: ImpactEffectState[];
  activeDamageNumbers: DamageNumberState[];
  playerGold: number;
  playerLives: number;
};

function handleCreepKill(state: CombatRuntimeState, deps: CombatRuntimeDependencies): void {
  const nextResources = addGold(
    { gold: state.playerGold, lives: state.playerLives },
    ECONOMY_BALANCE.creepKillRewardGold,
  );
  state.playerGold = nextResources.gold;
  deps.onGoldUpdated(state.playerGold);
  deps.playSound('combat.creep_death.basic');
  deps.playSound('economy.gold_gain');
  deps.onHudChanged();
}

function spawnImpactEffect(
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  x: number,
  y: number,
  isSplash: boolean,
): void {
  const frame = isSplash
    ? TOWER_BONE_ARCHER_EFFECT_FRAMES.attackEffect
    : TOWER_BONE_ARCHER_EFFECT_FRAMES.projectile;
  const effect = deps.scene.add.sprite(x, y, TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER, frame);
  const size = isSplash ? config.projectileDisplaySizePx * 1.7 : config.projectileDisplaySizePx * 1.25;
  effect.setDisplaySize(size, size);
  effect.setOrigin(0.5);
  effect.setDepth(config.impactEffectRenderDepth);
  if (isSplash) {
    effect.setTint(0x66ff88);
  }

  state.activeImpactEffects.push({
    sprite: effect,
    remainingMs: config.impactEffectLifetimeMs,
    maxLifetimeMs: config.impactEffectLifetimeMs,
  });
}

function spawnDamageNumber(
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  position: GridPosition,
  damage: number,
): void {
  if (!config.damageNumbersEnabled) {
    return;
  }

  const center = deps.toCellCenter(position);
  const text = deps.scene.add.text(center.x, center.y - 10, `${damage}`, {
    fontFamily: 'Exo 2, Segoe UI, Tahoma, sans-serif',
    fontSize: '11px',
    color: '#ffe9a8',
    stroke: '#1d2536',
    strokeThickness: 2,
  });
  text.setOrigin(0.5);

  state.activeDamageNumbers.push({
    text,
    startY: text.y,
    remainingMs: config.damageNumberLifetimeMs,
  });
}

function applyCreepHitFeedback(creep: CreepRenderState, config: CombatRuntimeConfig): void {
  creep.hitFlashRemainingMs = config.creepHitFlashDurationMs;
  creep.sprite.setTint(config.creepHitFlashColor);
}

function applySingleTargetDamage(
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  targetRenderState: CreepRenderState,
): void {
  const damageResult = applyDamageToCreep(targetRenderState.entity, tower.entity.combatStats.damage);

  targetRenderState.entity = damageResult.creep;
  applyCreepHitFeedback(targetRenderState, config);
  deps.playSound('combat.creep_hit');
  spawnDamageNumber(state, deps, config, targetRenderState.entity.position, tower.entity.combatStats.damage);

  if (damageResult.killed) {
    handleCreepKill(state, deps);
  }
}

function applySplashDamage(
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  tower: TowerRenderState,
  targetRenderState: CreepRenderState,
): void {
  const splashRadius = tower.entity.combatStats.splashRadius ?? 1.5;
  const towerCenter = tower.entity.position;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;

  const creepsInSplashRadius = state.activeCreeps.filter((creep) => {
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
    applyCreepHitFeedback(creep, config);
    totalDamageDealt += tower.entity.combatStats.damage;

    if (damageResult.killed) {
      handleCreepKill(state, deps);
    }
  }

  deps.playSound('combat.creep_hit');
  spawnDamageNumber(state, deps, config, targetRenderState.entity.position, totalDamageDealt);
}

function spawnProjectileFeedback(
  state: CombatRuntimeState,
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

  const projectile = deps.scene.add.sprite(fromCenter.x, fromCenter.y, TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER, frame);
  const displaySize = isSplash ? config.projectileDisplaySizePx * 1.6 : config.projectileDisplaySizePx;
  projectile.setDisplaySize(displaySize, displaySize);
  projectile.setOrigin(0.5);
  projectile.setDepth(config.projectileRenderDepth);
  if (isSplash) {
    projectile.setTint(0x44ff44);
  }

  state.activeProjectiles.push({
    sprite: projectile,
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
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (state.activeTowers.length === 0 || state.activeCreeps.length === 0) {
    return;
  }

  const creepsForTargeting = state.activeCreeps.map((creep) => creep.entity);

  for (const tower of state.activeTowers) {
    tower.runtime = tickTowerCooldown(tower.runtime, deltaMs);

    if (!canTowerAttack(tower.entity, tower.runtime)) {
      continue;
    }

    const targetCreep = selectTowerTarget(tower.entity, creepsForTargeting);

    if (!targetCreep) {
      continue;
    }

    const targetRenderState = state.activeCreeps.find((creep) => creep.entity.id === targetCreep.id);

    if (!targetRenderState) {
      continue;
    }

    const isSplashTower = tower.entity.type === 'splash';
    const splashRadius = tower.entity.combatStats.splashRadius ?? 0;

    if (isSplashTower && splashRadius > 0) {
      applySplashDamage(state, deps, config, tower, targetRenderState);
    } else {
      applySingleTargetDamage(state, deps, config, tower, targetRenderState);
    }

    tower.runtime = consumeTowerAttack(tower.entity, tower.runtime);
    if (isSplashTower) {
      deps.playSplashAttackAnimation(tower);
    } else {
      deps.playArcherAttackAnimation(tower);
    }
    spawnProjectileFeedback(state, deps, config, tower, targetRenderState.entity.position, isSplashTower);
    deps.playSound(isSplashTower ? 'combat.tower_attack.splash' : 'combat.tower_attack.archer');
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

    creep.sprite.destroy();
  }

  return aliveCreeps;
}

export function updateProjectiles(
  state: CombatRuntimeState,
  deps: CombatRuntimeDependencies,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (state.activeProjectiles.length === 0) {
    return;
  }

  const nextProjectiles: ProjectileState[] = [];

  for (const projectile of state.activeProjectiles) {
    const remainingMs = projectile.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      spawnImpactEffect(state, deps, config, projectile.toX, projectile.toY, projectile.isSplash);
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
      fromX: projectile.fromX,
      fromY: projectile.fromY,
      toX: projectile.toX,
      toY: projectile.toY,
      isSplash: projectile.isSplash,
      remainingMs,
      maxLifetimeMs: projectile.maxLifetimeMs,
    });
  }

  state.activeProjectiles = nextProjectiles;
}

export function updateImpactEffects(
  state: CombatRuntimeState,
  deltaMs: number,
): void {
  if (state.activeImpactEffects.length === 0) {
    return;
  }

  const nextEffects: ImpactEffectState[] = [];

  for (const effect of state.activeImpactEffects) {
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

  state.activeImpactEffects = nextEffects;
}

export function updateDamageNumbers(
  state: CombatRuntimeState,
  config: CombatRuntimeConfig,
  deltaMs: number,
): void {
  if (state.activeDamageNumbers.length === 0) {
    return;
  }

  const next: DamageNumberState[] = [];

  for (const numberState of state.activeDamageNumbers) {
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

  state.activeDamageNumbers = next;
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

    if (creep.hitFlashRemainingMs === 0) {
      creep.sprite.setTint(config.creepBaseColor);
      continue;
    }

    const progress = creep.hitFlashRemainingMs / config.creepHitFlashDurationMs;
    const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(config.creepBaseColor),
      Phaser.Display.Color.ValueToColor(config.creepHitFlashColor),
      100,
      Math.round(progress * 100),
    );
    creep.sprite.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
  }
}
