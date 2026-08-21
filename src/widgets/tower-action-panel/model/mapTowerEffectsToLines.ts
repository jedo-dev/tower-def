import { getTowerArchetype, type TowerCombatStats, type TowerOnHitEffect } from '../../../entities/tower';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { EffectId, TowerAttackKind, type TowerTypeId } from '../../../shared/types/content-ids';

/**
 * Turns a tower archetype and its current stats into the lines the panel shows,
 * so a player can compare a frost tower against a poison one before paying for
 * an upgrade.
 */
export type TowerEffectLine = {
  key: string;
  label: string;
  value: string;
};

const MILLISECONDS_PER_SECOND = 1000;

function formatSeconds(durationMs: number): string {
  return `${(durationMs / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function describeOnHitEffect(effect: TowerOnHitEffect): TowerEffectLine {
  const definition = resolveEffectDefinition(effect.effectId);
  const magnitude = effect.magnitude ?? definition.magnitude;
  const durationMs = effect.durationMs ?? definition.durationMs;
  const maxStacks = Math.max(definition.maxStacks, effect.maxStacks ?? definition.maxStacks);

  switch (effect.effectId) {
    case EffectId.CHILL:
      return { key: effect.effectId, label: 'SLOW', value: `${formatPercent(magnitude)} / ${formatSeconds(durationMs)}` };
    case EffectId.STUN:
      return { key: effect.effectId, label: 'STUN', value: formatSeconds(durationMs) };
    case EffectId.ARMOR_BREAK:
      return { key: effect.effectId, label: 'ARMOR', value: `-${magnitude} / ${formatSeconds(durationMs)}` };
    default: {
      const perSecond = definition.tickIntervalMs > 0
        ? (magnitude * MILLISECONDS_PER_SECOND) / definition.tickIntervalMs
        : magnitude;
      const label = effect.effectId === EffectId.POISON ? 'POISON' : 'BURN';

      return {
        key: effect.effectId,
        label,
        value: `${Math.round(perSecond)}/s x${maxStacks} / ${formatSeconds(durationMs)}`,
      };
    }
  }
}

export function mapTowerEffectsToLines(
  towerType: TowerTypeId,
  stats: TowerCombatStats,
): TowerEffectLine[] {
  const archetype = getTowerArchetype(towerType);
  const lines: TowerEffectLine[] = [];

  if (archetype.attackKind === TowerAttackKind.CHAIN && archetype.chain) {
    lines.push({
      key: 'chain',
      label: 'CHAIN',
      value: `${archetype.chain.bounces} jumps, -${formatPercent(archetype.chain.damageFalloff)} each`,
    });
  }

  if (archetype.aura) {
    lines.push({
      key: 'aura',
      label: 'AURA',
      value: `+${formatPercent(archetype.aura.attackSpeedBonus)} speed, +${archetype.aura.rangeBonus.toFixed(1)} range`,
    });
  }

  const onHitEffects = stats.onHitEffects ?? archetype.onHitEffects;

  for (const effect of onHitEffects) {
    lines.push(describeOnHitEffect(effect));
  }

  return lines;
}

/**
 * What the next level changes, as a short suffix per line. Only lines whose
 * value actually differs are returned, so an upgrade that only adds damage
 * shows nothing here.
 */
export function mapTowerEffectUpgradeDeltas(
  towerType: TowerTypeId,
  currentStats: TowerCombatStats,
  nextLevelStats: TowerCombatStats,
): TowerEffectLine[] {
  const currentLines = mapTowerEffectsToLines(towerType, currentStats);
  const nextLines = mapTowerEffectsToLines(towerType, nextLevelStats);

  return nextLines.filter((nextLine) => {
    const currentLine = currentLines.find((line) => line.key === nextLine.key);
    return currentLine === undefined || currentLine.value !== nextLine.value;
  });
}
