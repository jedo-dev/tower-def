import { describe, expect, it } from 'vitest';
import { EFFECT_BALANCE, EFFECT_DEFINITIONS, resolveEffectDefinition } from './effects';
import {
  EFFECT_IDS,
  EffectId,
  EffectKind,
  EffectStackingRule,
  isEffectId,
} from '../types/content-ids';

describe('effect definitions', () => {
  it('defines every declared effect exactly once', () => {
    expect(Object.keys(EFFECT_DEFINITIONS).sort()).toEqual([...EFFECT_IDS].sort());

    for (const effectId of EFFECT_IDS) {
      expect(resolveEffectDefinition(effectId).id, effectId).toBe(effectId);
    }
  });

  it('recognises known effect ids and rejects unknown ones', () => {
    expect(isEffectId('poison')).toBe(true);
    expect(isEffectId('bleed')).toBe(false);
    expect(isEffectId('')).toBe(false);
  });

  it('ticks only the effects that deal damage over time', () => {
    for (const definition of Object.values(EFFECT_DEFINITIONS)) {
      if (definition.kind === EffectKind.DAMAGE_OVER_TIME) {
        expect(definition.tickIntervalMs, definition.id).toBeGreaterThan(0);
        expect(definition.durationMs, definition.id).toBeGreaterThanOrEqual(definition.tickIntervalMs);
      } else {
        expect(definition.tickIntervalMs, definition.id).toBe(0);
      }
    }
  });

  it('declares a stacking rule that matches the stack cap', () => {
    for (const definition of Object.values(EFFECT_DEFINITIONS)) {
      expect(definition.maxStacks, definition.id).toBeGreaterThanOrEqual(1);

      if (definition.maxStacks > 1) {
        expect(definition.stackingRule, definition.id).toBe(EffectStackingRule.STACK);
      } else {
        expect(definition.stackingRule, definition.id).not.toBe(EffectStackingRule.STACK);
      }
    }
  });

  it('keeps every effect on a finite timer', () => {
    for (const definition of Object.values(EFFECT_DEFINITIONS)) {
      expect(definition.durationMs, definition.id).toBeGreaterThan(0);
      expect(Number.isFinite(definition.durationMs), definition.id).toBe(true);
    }
  });

  it('slows with chill and stops with stun', () => {
    const chill = resolveEffectDefinition(EffectId.CHILL);
    const stun = resolveEffectDefinition(EffectId.STUN);

    expect(chill.kind).toBe(EffectKind.MOVEMENT);
    expect(chill.magnitude).toBeGreaterThan(0);
    expect(chill.magnitude).toBeLessThan(1);
    expect(stun.magnitude).toBe(1);
    expect(stun.durationMs).toBeLessThan(chill.durationMs);
  });

  it('leaves a creep able to move under any non-stun slow', () => {
    expect(EFFECT_BALANCE.minimumSpeedMultiplier).toBeGreaterThan(0);
    expect(EFFECT_BALANCE.minimumSpeedMultiplier).toBeLessThan(1);
    expect(1 - resolveEffectDefinition(EffectId.CHILL).magnitude)
      .toBeGreaterThanOrEqual(EFFECT_BALANCE.minimumSpeedMultiplier);
  });

  it('bounds how many distinct effects one creep can carry', () => {
    expect(EFFECT_BALANCE.maxDistinctEffectsPerCreep).toBe(EFFECT_IDS.length);
  });
});
