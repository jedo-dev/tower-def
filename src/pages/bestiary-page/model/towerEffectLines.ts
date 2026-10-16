import type { TowerOnHitEffect } from '../../../entities/tower';
import { resolveEffectDefinition, resolveEffectMaxStacks } from '../../../shared/constants/effects';
import { ArmorKind, DamageScope, DamageType, EffectId } from '../../../shared/types/content-ids';
import { formatPercentOfMaxHealth } from './combatTypeDisplay';
import type { TowerSpecialViewModel } from './types';

/**
 * Display text for a tower's on-hit effects, shared by the level summaries,
 * the specials list and the talent grade tables of the bestiary card.
 */

const MILLISECONDS_PER_SECOND = 1000;

export function formatSeconds(durationMs: number): string {
  return `${(durationMs / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatCells(cells: number): string {
  return `${Number(cells.toFixed(1))} cells`;
}

const ARMOR_KIND_LABELS: Record<ArmorKind, string> = {
  [ArmorKind.PHYSICAL]: 'physical armor',
  [ArmorKind.MAGICAL]: 'magical armor',
  [ArmorKind.BOTH]: 'armor',
};

const DAMAGE_SCOPE_LABELS: Record<DamageScope, string> = {
  [DamageScope.PHYSICAL]: 'physical damage',
  [DamageScope.MAGICAL]: 'magical damage',
  [DamageScope.PERCENT]: 'percent damage',
  [DamageScope.ALL]: 'damage',
};

function describeStacks(maxStacks: number): string {
  return maxStacks > 1 ? `, up to ${maxStacks} stacks` : '';
}

function describeChill(effect: TowerOnHitEffect, magnitude: number, durationMs: number): string {
  const slow = `${formatPercent(magnitude)} slower for ${formatSeconds(durationMs)}`;

  if (effect.freezeAtStacks === undefined) {
    return slow;
  }

  const freezeMs = effect.freezeMs ?? resolveEffectDefinition(EffectId.STUN).durationMs;
  return `${slow}; every ${effect.freezeAtStacks} hits freeze ${formatSeconds(freezeMs)}`;
}

function describeDamageOverTime(
  effect: TowerOnHitEffect,
  magnitude: number,
  durationMs: number,
  maxStacks: number,
): string {
  const definition = resolveEffectDefinition(effect.effectId);
  const perSecond =
    definition.tickIntervalMs > 0
      ? (magnitude * MILLISECONDS_PER_SECOND) / definition.tickIntervalMs
      : magnitude;
  const rate =
    effect.damageType === DamageType.PERCENT
      ? `${formatPercentOfMaxHealth(perSecond)}/s`
      : `${Math.round(perSecond)} dmg/s`;

  return `${rate} for ${formatSeconds(durationMs)}${describeStacks(maxStacks)}`;
}

export function describeOnHitEffect(effect: TowerOnHitEffect): TowerSpecialViewModel {
  const definition = resolveEffectDefinition(effect.effectId);
  const magnitude = effect.magnitude ?? definition.magnitude;
  const durationMs = effect.durationMs ?? definition.durationMs;
  // The authored cap when present, as in `applyEffectToCreep`.
  const maxStacks = resolveEffectMaxStacks(effect.effectId, effect.maxStacks);

  switch (effect.effectId) {
    case EffectId.CHILL:
      return {
        key: effect.effectId,
        label: 'Chill',
        value: describeChill(effect, magnitude, durationMs),
      };
    case EffectId.STUN:
      return { key: effect.effectId, label: 'Stun', value: formatSeconds(durationMs) };
    case EffectId.ARMOR_BREAK: {
      const armor = ARMOR_KIND_LABELS[effect.armorKind ?? ArmorKind.BOTH];
      return {
        key: `${effect.effectId}-${effect.armorKind ?? ArmorKind.BOTH}`,
        label: 'Armor break',
        value: `-${magnitude} ${armor} for ${formatSeconds(durationMs)}${describeStacks(maxStacks)}`,
      };
    }
    case EffectId.VULNERABILITY: {
      const damage = DAMAGE_SCOPE_LABELS[effect.damageKind ?? DamageScope.ALL];
      return {
        key: effect.effectId,
        label: 'Vulnerable',
        value: `+${formatPercent(magnitude)} ${damage} taken for ${formatSeconds(durationMs)}`,
      };
    }
    default:
      return {
        key: effect.effectId,
        label: effect.effectId === EffectId.POISON ? 'Poison' : 'Burn',
        value: describeDamageOverTime(effect, magnitude, durationMs, maxStacks),
      };
  }
}
