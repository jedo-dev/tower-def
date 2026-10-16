import { TOWER_BONE_ARCHER_EFFECT_FRAMES } from '../../../../shared/constants/sprites';
import type { TowerTypeId } from '../../../../shared/types/content-ids';
import { IMPACT_EFFECT_SPLASH_TINT } from '../../scenes/gameScene.constants';
import type { ImpactEffectState } from '../../scenes/gameScene.types';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
import {
  createRenderRecordPool,
  releasePooledRecord,
  takePooledRecord,
  type RenderRecordPool,
} from './renderRecordPool';
import { resolveShotTint } from './shotTint';

const impactEffectPool: RenderRecordPool<ImpactEffectState> = createRenderRecordPool();

/** The module-wide impact effect record pool; exposed so tests can check reuse. */
export function getImpactEffectPool(): RenderRecordPool<ImpactEffectState> {
  return impactEffectPool;
}

/** The flash where a projectile lands; fades out over `impactEffectLifetimeMs`. */
export function spawnImpactEffect(
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

  const record = takePooledRecord(impactEffectPool);
  if (record === undefined) {
    battlefield.impactEffects.push({
      sprite: effect,
      remainingMs: config.impactEffectLifetimeMs,
      maxLifetimeMs: config.impactEffectLifetimeMs,
    });
    return;
  }

  record.sprite = effect;
  record.remainingMs = config.impactEffectLifetimeMs;
  record.maxLifetimeMs = config.impactEffectLifetimeMs;
  battlefield.impactEffects.push(record);
}

/** Fades impact effects, destroys expired ones and compacts the list in place. */
export function updateImpactEffects(battlefield: BattlefieldRenderState, deltaMs: number): void {
  const effects = battlefield.impactEffects;
  if (effects.length === 0) {
    return;
  }

  let writeIndex = 0;

  for (let readIndex = 0; readIndex < effects.length; readIndex += 1) {
    const effect = effects[readIndex];
    const remainingMs = effect.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      effect.sprite.destroy();
      releasePooledRecord(impactEffectPool, effect);
      continue;
    }

    effect.sprite.setAlpha(remainingMs / effect.maxLifetimeMs);
    effect.remainingMs = remainingMs;
    effects[writeIndex] = effect;
    writeIndex += 1;
  }

  effects.length = writeIndex;
}
