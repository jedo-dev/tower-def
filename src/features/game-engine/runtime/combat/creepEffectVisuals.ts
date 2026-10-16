import type Phaser from 'phaser';
import { getActiveEffects, type ActiveEffect } from '../../../../entities/creep';
import { EFFECT_IDS, type EffectId } from '../../../../shared/types/content-ids';
import {
  CREEP_EFFECT_PIP_FONT_SIZE_PX,
  CREEP_EFFECT_PIP_MIN_EFFECTS,
  CREEP_EFFECT_PIP_GAP_PX,
  CREEP_EFFECT_PIP_RENDER_DEPTH,
  CREEP_EFFECT_TINT_PRIORITY,
  CREEP_EFFECT_TINTS,
} from '../../scenes/gameScene.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';

const PIP_GLYPH = '•';

/**
 * Tint the creep should carry right now. A creep with several effects shows the
 * one highest in the priority list, so the colour is deterministic rather than
 * dependent on application order.
 */
export function resolveCreepEffectTint(creep: CreepRenderState): number | undefined {
  const effects = getActiveEffects(creep.entity);

  if (effects.length === 0) {
    return undefined;
  }

  for (const effectId of CREEP_EFFECT_TINT_PRIORITY) {
    if (effects.some((effect) => effect.id === effectId)) {
      return CREEP_EFFECT_TINTS[effectId];
    }
  }

  return undefined;
}

/** Colour to restore after a hit flash: the effect tint if any, else the faction tint. */
export function resolveCreepRestingTint(creep: CreepRenderState, fallbackTint: number): number {
  return resolveCreepEffectTint(creep) ?? creep.baseTint ?? fallbackTint;
}

function toCssColor(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

/**
 * Each effect id owns one 8-bit digit of the signature (6 ids = 48 bits, inside
 * the 53-bit safe integer range), so the sum counts every id separately: two
 * effect lists share a signature exactly when they hold the same ids the same
 * number of times, in any order. That is the multiset the old sorted, joined
 * id string described. Stacks are left out on purpose: tint and pips depend
 * only on which effects run, so a stack change must not trigger a repaint.
 */
const EFFECT_SIGNATURE_DIGIT_BASE = 256;
const EFFECT_SIGNATURE_WEIGHTS = new Map<EffectId, number>(
  EFFECT_IDS.map((effectId, index) => [effectId, EFFECT_SIGNATURE_DIGIT_BASE ** index]),
);

/** Signature of an effect list with no effects (and of a creep never painted). */
export const EMPTY_EFFECT_SIGNATURE = 0;

/** Allocation-free signature of the ids in `effects`; see `EFFECT_SIGNATURE_WEIGHTS`. */
export function computeEffectSignature(effects: readonly ActiveEffect[]): number {
  let signature = EMPTY_EFFECT_SIGNATURE;
  for (let index = 0; index < effects.length; index += 1) {
    signature += EFFECT_SIGNATURE_WEIGHTS.get(effects[index].id) ?? 0;
  }
  return signature;
}

export function syncCreepEffectPipPosition(creep: CreepRenderState): void {
  if (!creep.effectPips) {
    return;
  }

  // Pips sit just above the sprite, so they clear a large creep's art as well.
  const spriteHalfHeightPx = (creep.sprite.displayHeight || 0) / 2;
  creep.effectPips.setPosition(
    creep.sprite.x,
    creep.sprite.y - spriteHalfHeightPx - CREEP_EFFECT_PIP_GAP_PX,
  );
}

/**
 * Repaints a creep only when its set of effects actually changed, so the frame
 * budget pays for status feedback once per application, not once per frame.
 */
export function refreshCreepEffectVisuals(
  scene: Phaser.Scene,
  creep: CreepRenderState,
  fallbackTint: number,
): void {
  const effects = getActiveEffects(creep.entity);
  const signature = computeEffectSignature(effects);

  if (signature === (creep.effectVisualSignature ?? EMPTY_EFFECT_SIGNATURE)) {
    return;
  }

  creep.effectVisualSignature = signature;

  const restingTint = resolveCreepRestingTint(creep, fallbackTint);

  // A flashing creep is repainted by the hit feedback pass when the flash ends.
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

/** Single teardown point for a creep, so status pips cannot outlive their sprite. */
export function destroyCreepRenderState(creep: CreepRenderState): void {
  creep.effectPips?.destroy();
  creep.effectPips = undefined;
  creep.sprite.destroy();
}
