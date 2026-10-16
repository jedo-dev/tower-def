import {
  getTowerArchetype,
  resolveBuildableTowerDamageType,
  type BuildableTowerConfig,
  type TowerArchetypeDefinition,
  type TowerUpgradeLevel,
} from '../../../entities/tower';
import { DamageType } from '../../../shared/types/content-ids';
import { describeDamageType, formatPercentOfMaxHealth } from './combatTypeDisplay';
import { readLore } from './creepCards';
import { describeGradeSpecial, mapTalentBranch } from './towerBranchCards';
import { goldReading, towerAttackReadings } from './statReadings';
import { describeOnHitEffect, formatCells, formatPercent, formatSeconds } from './towerEffectLines';
import type { TowerCardViewModel, TowerLevelViewModel, TowerSpecialViewModel } from './types';

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

function resolveLevels(
  tower: BuildableTowerConfig,
  archetype: TowerArchetypeDefinition,
): readonly TowerUpgradeLevel[] {
  return tower.levels && tower.levels.length > 0 ? tower.levels : archetype.levels;
}

const NO_GRADE_SPECIAL = '—';

/** A level's extras, or null when they read the same as the level before. */
function levelSpecial(level: TowerUpgradeLevel, previous: TowerUpgradeLevel | null): string | null {
  const special = describeGradeSpecial(level.stats);
  if (special === NO_GRADE_SPECIAL) {
    return null;
  }
  return previous !== null && describeGradeSpecial(previous.stats) === special ? null : special;
}

function mapLevels(
  tower: BuildableTowerConfig,
  levels: readonly TowerUpgradeLevel[],
  damageType: DamageType,
): TowerLevelViewModel[] {
  return levels.map((level, index) => {
    const previous = index > 0 ? levels[index - 1] : null;
    return {
      level: level.level,
      upgradeCost: level.level === 1 ? null : level.upgradeCostGold,
      cost: level.level === 1 ? tower.costGold : level.upgradeCostGold,
      summary: summarizeLevel(level, damageType),
      stats: towerAttackReadings(level.stats, previous?.stats ?? null, damageType),
      special: levelSpecial(level, previous),
    };
  });
}

export function mapTowerToTowerCard(tower: BuildableTowerConfig): TowerCardViewModel {
  const archetype = getTowerArchetype(tower.towerType);
  const damageType = resolveBuildableTowerDamageType(tower);
  const levels = resolveLevels(tower, archetype);
  const topLevel = levels[levels.length - 1];
  const baseAttack = tower;
  const tileStats = towerAttackReadings(baseAttack, null, damageType);

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
    tileStats,
    headerStats: [...tileStats, goldReading('Build cost, gold', tower.costGold)],
    specials: mapSpecials(tower, archetype),
    levels: mapLevels(tower, levels, damageType),
    talentBranches: tower.talentBranches.map((branch, branchIndex) =>
      mapTalentBranch(branch, branchIndex, damageType, {
        level: topLevel?.level ?? 1,
        numbers: topLevel?.stats ?? baseAttack,
      }),
    ),
    description: tower.description,
    lore: readLore(tower),
  };
}

export function mapTowersToTowerCards(
  towers: readonly BuildableTowerConfig[],
): TowerCardViewModel[] {
  return towers.map(mapTowerToTowerCard);
}
