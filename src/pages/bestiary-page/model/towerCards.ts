import {
  getTowerArchetype,
  resolveBuildableTowerDamageType,
  type BuildableTowerConfig,
  type TowerArchetypeDefinition,
  type TowerOnHitEffect,
  type TowerUpgradeLevel,
} from '../../../entities/tower';
import { resolveEffectDefinition } from '../../../shared/constants/effects';
import { DamageType, EffectId } from '../../../shared/types/content-ids';
import { describeDamageType, formatPercentOfMaxHealth } from './combatTypeDisplay';
import { readLore } from './creepCards';
import type { TowerCardViewModel, TowerLevelViewModel, TowerSpecialViewModel } from './types';

const MILLISECONDS_PER_SECOND = 1000;

function formatSeconds(durationMs: number): string {
  return `${(durationMs / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function formatCells(cells: number): string {
  return `${Number(cells.toFixed(1))} cells`;
}

function describeOnHitEffect(effect: TowerOnHitEffect): TowerSpecialViewModel {
  const definition = resolveEffectDefinition(effect.effectId);
  const magnitude = effect.magnitude ?? definition.magnitude;
  const durationMs = effect.durationMs ?? definition.durationMs;
  const maxStacks = Math.max(definition.maxStacks, effect.maxStacks ?? definition.maxStacks);

  switch (effect.effectId) {
    case EffectId.CHILL:
      return {
        key: effect.effectId,
        label: 'Chill',
        value: `${formatPercent(magnitude)} slower for ${formatSeconds(durationMs)}`,
      };
    case EffectId.STUN:
      return { key: effect.effectId, label: 'Stun', value: formatSeconds(durationMs) };
    case EffectId.ARMOR_BREAK:
      return {
        key: effect.effectId,
        label: 'Armor break',
        value: `-${magnitude} armor for ${formatSeconds(durationMs)}`,
      };
    default: {
      const perSecond =
        definition.tickIntervalMs > 0
          ? (magnitude * MILLISECONDS_PER_SECOND) / definition.tickIntervalMs
          : magnitude;
      const label = effect.effectId === EffectId.POISON ? 'Poison' : 'Burn';
      const stacks = maxStacks > 1 ? `, up to ${maxStacks} stacks` : '';
      const rate =
        effect.damageType === DamageType.PERCENT
          ? `${formatPercentOfMaxHealth(perSecond)}/s`
          : `${Math.round(perSecond)} dmg/s`;

      return {
        key: effect.effectId,
        label,
        value: `${rate} for ${formatSeconds(durationMs)}${stacks}`,
      };
    }
  }
}

function mapSpecials(
  tower: BuildableTowerConfig,
  archetype: TowerArchetypeDefinition,
): TowerSpecialViewModel[] {
  const specials: TowerSpecialViewModel[] = [];
  const splashRadius = tower.splashRadius ?? archetype.splashRadius;

  if (splashRadius !== undefined) {
    specials.push({ key: 'splash', label: 'Splash', value: formatCells(splashRadius) });
  }

  if (archetype.chain) {
    specials.push({
      key: 'chain',
      label: 'Chain',
      value: `${archetype.chain.bounces} jumps within ${formatCells(archetype.chain.bounceRangeCells)}, -${formatPercent(archetype.chain.damageFalloff)} each`,
    });
  }

  if (archetype.aura) {
    specials.push({
      key: 'aura',
      label: 'Aura',
      value: `+${formatPercent(archetype.aura.attackSpeedBonus)} attack speed, +${Number(archetype.aura.rangeBonus.toFixed(1))} range within ${formatCells(archetype.aura.radiusCells)}`,
    });
  }

  const onHitEffects = tower.onHitEffects.length > 0 ? tower.onHitEffects : archetype.onHitEffects;
  for (const effect of onHitEffects) {
    specials.push(describeOnHitEffect(effect));
  }

  return specials;
}

/** Hit damage as a player reads it: points, or a share of max HP for percent towers. */
function formatHitDamage(damage: number, damageType: DamageType): string {
  return damageType === DamageType.PERCENT ? formatPercentOfMaxHealth(damage) : String(damage);
}

function summarizeLevel(level: TowerUpgradeLevel, damageType: DamageType): string {
  const damage = formatHitDamage(level.stats.damage, damageType);
  const parts = [
    damageType === DamageType.PERCENT ? damage : `${damage} dmg`,
    `${Number(level.stats.range.toFixed(1))} range`,
    formatSeconds(level.stats.attackCooldownMs),
  ];

  if (level.stats.splashRadius !== undefined) {
    parts.push(`${Number(level.stats.splashRadius.toFixed(1))} splash`);
  }
  if (level.stats.aura) {
    parts.push(
      `aura +${formatPercent(level.stats.aura.attackSpeedBonus)} / ${level.stats.aura.radiusCells} cells`,
    );
  }
  for (const effect of level.stats.onHitEffects ?? []) {
    const special = describeOnHitEffect(effect);
    parts.push(`${special.label.toLowerCase()} ${special.value}`);
  }

  return parts.join(', ');
}

function mapLevels(
  tower: BuildableTowerConfig,
  archetype: TowerArchetypeDefinition,
): TowerLevelViewModel[] {
  const levels = tower.levels && tower.levels.length > 0 ? tower.levels : archetype.levels;
  const damageType = resolveBuildableTowerDamageType(tower);

  return levels.map((level) => ({
    level: level.level,
    upgradeCost: level.level === 1 ? null : level.upgradeCostGold,
    summary: summarizeLevel(level, damageType),
  }));
}

export function mapTowerToTowerCard(tower: BuildableTowerConfig): TowerCardViewModel {
  const archetype = getTowerArchetype(tower.towerType);
  const damageType = resolveBuildableTowerDamageType(tower);

  return {
    id: tower.id,
    name: tower.name,
    spriteKey: tower.spriteKey,
    archetypeName: archetype.name,
    cost: tower.costGold,
    damage: tower.damage,
    damageLabel: formatHitDamage(tower.damage, damageType),
    damageType: describeDamageType(damageType),
    rangeCells: tower.range,
    cooldownMs: tower.attackCooldownMs,
    specials: mapSpecials(tower, archetype),
    levels: mapLevels(tower, archetype),
    description: tower.description,
    lore: readLore(tower),
  };
}

export function mapTowersToTowerCards(
  towers: readonly BuildableTowerConfig[],
): TowerCardViewModel[] {
  return towers.map(mapTowerToTowerCard);
}
