import { getTowerKillBonusGold } from '../../../../entities/tower';
import { isCreepDead, type ApplyEffectInput } from '../../../../entities/creep';
import { getKillGoldPenalty } from '../../../../entities/duel-match';
import { EffectId } from '../../../../shared/types/content-ids';
import type { SoundId } from '../../../../shared/lib/sound-registry/audio.types';
import { CreepSoundSlot, TowerSoundSlot } from '../../../../shared/types/sound-ids';
import type { CreepRenderState, TowerRenderState } from '../../scenes/gameScene.types';
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
import type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
import { spawnDamageNumber } from './damageNumbers';
import { resolveHitFlashTint } from './hitFlashTint';
import { spawnProjectileFeedback } from './projectiles';
import {
  applyTowerEffect,
  resolveTowerAttacks,
  tickFieldCreepEffects,
  type TowerCombatHooks,
} from './towerCombatCore';

export type { CombatRuntimeConfig, CombatRuntimeDependencies } from './combatRuntimeTypes';
export { updateDamageNumbers } from './damageNumbers';
export { updateImpactEffects } from './impactEffects';
export { updateProjectiles } from './projectiles';
export { renderGroundZones } from './groundZoneRenderer';

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

function applyCreepHitFeedback(creep: CreepRenderState, config: CombatRuntimeConfig): void {
  creep.hitFlashRemainingMs = config.creepHitFlashDurationMs;
  creep.sprite.setTint(config.creepHitFlashColor);
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
    writeCellCenter: deps.writeCellCenter,
    onCreepHit: (creep) => {
      applyCreepHitFeedback(creep, config);
      deps.soundRouter.playCreepSound(creep, CreepSoundSlot.HIT);
    },
    onTargetStruck: (tower) => deps.soundRouter.playTowerSound(tower.entity, TowerSoundSlot.IMPACT),
    onDamageDealt: (position, damage, source) =>
      spawnDamageNumber(battlefield, deps, config, position, damage, source),
    onEffectApplied: (creep, effectId) => {
      refreshCreepEffectVisuals(
        deps.scene,
        creep,
        config.creepBaseColor,
        deps.floatingLabels.rasterScale,
      );
      const soundId = EFFECT_APPLIED_SOUND_BY_EFFECT[effectId];
      if (soundId) {
        deps.playSound(soundId);
      }
    },
    onEffectsTicked: (creep) =>
      refreshCreepEffectVisuals(
        deps.scene,
        creep,
        config.creepBaseColor,
        deps.floatingLabels.rasterScale,
      ),
    onCreepKilled: (creep, killer) => handleCreepKill(deps, creep, killer),
    onCreepRevived: (creep) =>
      refreshCreepEffectVisuals(
        deps.scene,
        creep,
        config.creepBaseColor,
        deps.floatingLabels.rasterScale,
      ),
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
  if (battlefield.creeps.length === 0 && battlefield.groundZones.count === 0) {
    return;
  }

  const clampedDeltaMs = Math.min(deltaMs, config.effectMaxSimulationDeltaMs);
  tickFieldCreepEffects(
    battlefield,
    getRenderCombatHooks(battlefield, deps, config),
    clampedDeltaMs,
  );
}

/**
 * Advances death animations and fades, destroys finished creeps and compacts
 * `activeCreeps` in place (order kept), so the frame allocates no new list.
 * Every holder reads the list through the battlefield, so its identity stays.
 */
export function removeDeadCreepsFromActiveWave(
  activeCreeps: CreepRenderState[],
  deltaMs: number,
  deathFadeDurationMs: number,
  deathAnimationDurationMs = deathFadeDurationMs,
): void {
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < activeCreeps.length; readIndex += 1) {
    const creep = activeCreeps[readIndex];
    if (isCreepStillShown(creep, deltaMs, deathFadeDurationMs, deathAnimationDurationMs)) {
      activeCreeps[writeIndex] = creep;
      writeIndex += 1;
      continue;
    }

    destroyCreepRenderState(creep);
  }

  activeCreeps.length = writeIndex;
}

/** Steps a dead creep's death row or fade; false once it should be destroyed. */
function isCreepStillShown(
  creep: CreepRenderState,
  deltaMs: number,
  deathFadeDurationMs: number,
  deathAnimationDurationMs: number,
): boolean {
  if (!isCreepDead(creep.entity)) {
    return true;
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
    return creep.deathFadeRemainingMs > 0;
  }

  if (creep.deathFadeRemainingMs <= 0) {
    creep.deathFadeRemainingMs = deathFadeDurationMs;
  }

  creep.deathFadeRemainingMs = Math.max(0, creep.deathFadeRemainingMs - deltaMs);
  creep.sprite.setAlpha(creep.deathFadeRemainingMs / deathFadeDurationMs);
  return creep.deathFadeRemainingMs > 0;
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

    creep.sprite.setTint(
      resolveHitFlashTint(
        baseColor,
        config.creepHitFlashColor,
        creep.hitFlashRemainingMs,
        config.creepHitFlashDurationMs,
      ),
    );
  }
}
