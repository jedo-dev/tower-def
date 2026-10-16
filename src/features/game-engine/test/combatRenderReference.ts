import type Phaser from 'phaser';
import { getActiveEffects, isCreepDead } from '../../../entities/creep';
import type { EffectId } from '../../../shared/types/content-ids';
import { getCreepDeathAnimationKey } from '../runtime/animation/creepFacing';
import {
  destroyCreepRenderState,
  resolveCreepRestingTint,
  syncCreepEffectPipPosition,
} from '../runtime/combat/creepEffectVisuals';
import {
  CREEP_EFFECT_PIP_FONT_SIZE_PX,
  CREEP_EFFECT_PIP_MIN_EFFECTS,
  CREEP_EFFECT_PIP_RENDER_DEPTH,
} from '../scenes/gameScene.constants';
import type { CreepRenderState } from '../scenes/gameScene.types';

// Verbatim copies of the creep render paths tower-def-5rh rewrote to stop
// allocating every frame. Tests run them next to the live code on seeded
// scenarios: same inputs must give the same sprites, calls and lists.

const PIP_GLYPH = '•';

function toCssColor(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

function buildEffectSignature(effectIds: readonly EffectId[]): string {
  return [...effectIds].sort().join(',');
}

/** The old string signature, kept aside so the creep type stays the live one. */
const referenceSignatures = new WeakMap<CreepRenderState, string>();

/** Pre-rewrite signature: the sorted, joined effect ids. */
export function referenceEffectSignature(effectIds: readonly EffectId[]): string {
  return buildEffectSignature(effectIds);
}

/** Pre-rewrite `refreshCreepEffectVisuals`: a sorted id string per call. */
export function referenceRefreshCreepEffectVisuals(
  scene: Phaser.Scene,
  creep: CreepRenderState,
  fallbackTint: number,
): void {
  const effects = getActiveEffects(creep.entity);
  const signature = buildEffectSignature(effects.map((effect) => effect.id));

  if (signature === (referenceSignatures.get(creep) ?? '')) {
    return;
  }

  referenceSignatures.set(creep, signature);

  const restingTint = resolveCreepRestingTint(creep, fallbackTint);

  if (creep.hitFlashRemainingMs <= 0) {
    creep.sprite.setTint(restingTint);
  }

  if (effects.length < CREEP_EFFECT_PIP_MIN_EFFECTS) {
    creep.effectPips?.destroy();
    creep.effectPips = undefined;
    return;
  }

  const label = PIP_GLYPH.repeat(effects.length);

  if (!creep.effectPips) {
    creep.effectPips = scene.add.text(creep.sprite.x, creep.sprite.y, label, {
      fontFamily: 'Exo 2, Segoe UI, Tahoma, sans-serif',
      fontSize: `${CREEP_EFFECT_PIP_FONT_SIZE_PX}px`,
      color: toCssColor(restingTint),
    });
    creep.effectPips.setOrigin(0.5, 1);
    creep.effectPips.setDepth(CREEP_EFFECT_PIP_RENDER_DEPTH);
  } else {
    creep.effectPips.setText(label);
    creep.effectPips.setColor(toCssColor(restingTint));
  }

  syncCreepEffectPipPosition(creep);
}

/** Pre-rewrite `removeDeadCreepsFromActiveWave`: returns a fresh list. */
export function referenceRemoveDeadCreepsFromActiveWave(
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
