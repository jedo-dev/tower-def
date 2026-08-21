import type Phaser from 'phaser';
import { getActiveEffects } from '../../../../../entities/creep';
import type { EffectId } from '../../../../types/content-ids';
import {
  CREEP_EFFECT_PIP_FONT_SIZE_PX,
  CREEP_EFFECT_PIP_MIN_EFFECTS,
  CREEP_EFFECT_PIP_OFFSET_Y_PX,
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

function buildEffectSignature(effectIds: readonly EffectId[]): string {
  return [...effectIds].sort().join(',');
}

export function syncCreepEffectPipPosition(creep: CreepRenderState): void {
  if (!creep.effectPips) {
    return;
  }

  creep.effectPips.setPosition(creep.sprite.x, creep.sprite.y + CREEP_EFFECT_PIP_OFFSET_Y_PX);
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
  const signature = buildEffectSignature(effects.map((effect) => effect.id));

  if (signature === (creep.effectVisualSignature ?? '')) {
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
    creep.effectPips.setOrigin(0.5);
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
