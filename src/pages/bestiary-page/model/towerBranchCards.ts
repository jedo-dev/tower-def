import type {
  TowerAbilities,
  TowerLevelStats,
  TowerTalentBranchDefinition,
  TowerUpgradeLevel,
} from '../../../entities/tower';
import { DamageScope, DamageType } from '../../../shared/types/content-ids';
import { formatPercentOfMaxHealth } from './combatTypeDisplay';
import { describeOnHitEffect, formatCells, formatPercent, formatSeconds } from './towerEffectLines';
import type { TowerBranchGradeViewModel, TowerBranchViewModel } from './types';

/**
 * Talent branches on the bestiary card: one row per grade 4-7 with damage,
 * range and cooldown, plus a plain-language line of everything else the grade
 * does (splash, chain, aura, abilities, on-hit effects).
 */

type TowerAuraStats = NonNullable<TowerLevelStats['aura']>;
type TowerChainStats = NonNullable<TowerLevelStats['chain']>;

const NO_SPECIAL = '—';

function formatMultiplier(multiplier: number): string {
  return `x${Number(multiplier.toFixed(2))}`;
}

function describeAbilities(abilities: TowerAbilities): string[] {
  const parts: string[] = [];

  if (abilities.critEveryNthShot !== undefined && abilities.critMultiplier !== undefined) {
    parts.push(
      `every ${abilities.critEveryNthShot} shots crit ${formatMultiplier(abilities.critMultiplier)}`,
    );
  }
  if (abilities.extraTargets !== undefined) {
    const share = abilities.extraTargetDamageShare ?? 1;
    const targets = abilities.extraTargets === 1 ? 'target' : 'targets';
    parts.push(`+${abilities.extraTargets} ${targets} at ${formatPercent(share)}`);
  }
  if (abilities.pierceLine !== undefined) {
    parts.push(`pierces the line at ${formatPercent(abilities.pierceLine)}`);
  }
  if (abilities.coneDegrees !== undefined) {
    parts.push(`hits all in a ${abilities.coneDegrees}° cone`);
  }
  if (abilities.knockbackCells !== undefined) {
    parts.push(`knocks small and medium back ${formatCells(abilities.knockbackCells)}`);
  }
  if (abilities.airDamageMultiplier !== undefined) {
    parts.push(`${formatMultiplier(abilities.airDamageMultiplier)} vs air`);
  }
  if (abilities.groundDamageMultiplier !== undefined) {
    parts.push(`${formatMultiplier(abilities.groundDamageMultiplier)} vs ground`);
  }
  if (abilities.fullHealthBonusMultiplier !== undefined) {
    parts.push(`${formatMultiplier(abilities.fullHealthBonusMultiplier)} vs full health`);
  }
  if (abilities.largeTargetMultiplier !== undefined) {
    parts.push(`${formatMultiplier(abilities.largeTargetMultiplier)} vs large`);
  }
  if (abilities.minRangeCells !== undefined) {
    parts.push(`no shots within ${formatCells(abilities.minRangeCells)}`);
  }
  if (abilities.volleyEveryMs !== undefined) {
    const share = abilities.volleyDamageShare ?? 1;
    const damage = share === 1 ? '' : ` at ${formatPercent(share)}`;
    parts.push(`volley at all in range${damage} every ${formatSeconds(abilities.volleyEveryMs)}`);
  }

  return parts;
}

function describeAuraDamageBonus(aura: TowerAuraStats): string | null {
  if (aura.damagePercentBonus === undefined) {
    return null;
  }

  const scope = aura.damageBonusType ?? DamageScope.ALL;
  const towers = scope === DamageScope.ALL ? '' : ` ${scope}`;
  return `+${formatPercent(aura.damagePercentBonus)}${towers} damage`;
}

function describeAura(aura: TowerAuraStats): string {
  const bonuses = [
    aura.attackSpeedBonus > 0 ? `+${formatPercent(aura.attackSpeedBonus)} attack speed` : null,
    aura.rangeBonus > 0 ? `+${Number(aura.rangeBonus.toFixed(1))} range` : null,
    describeAuraDamageBonus(aura),
    aura.goldPerKill ? `+${aura.goldPerKill}g per kill` : null,
    aura.incomePerRound ? `+${aura.incomePerRound}g income per round` : null,
    aura.sellRefundBonus ? `+${formatPercent(aura.sellRefundBonus)} sell refund` : null,
  ].filter((bonus): bonus is string => bonus !== null);

  return `aura ${formatCells(aura.radiusCells)}: ${bonuses.join(', ')}`;
}

function describeChain(chain: TowerChainStats): string {
  return `${chain.bounces} jumps within ${formatCells(chain.bounceRangeCells)}, -${formatPercent(chain.damageFalloff)} each`;
}

export function describeGradeSpecial(stats: TowerLevelStats): string {
  const parts: string[] = [];

  if (stats.allowedTargets !== undefined) {
    parts.push(`targets ${stats.allowedTargets}`);
  }
  if (stats.splashRadius !== undefined) {
    parts.push(`splash ${formatCells(stats.splashRadius)}`);
  }
  if (stats.chain) {
    parts.push(describeChain(stats.chain));
  }
  if (stats.aura) {
    parts.push(describeAura(stats.aura));
  }
  parts.push(...describeAbilities(stats.abilities ?? {}));
  for (const effect of stats.onHitEffects ?? []) {
    const line = describeOnHitEffect(effect);
    parts.push(`${line.label.toLowerCase()} ${line.value}`);
  }

  return parts.length > 0 ? parts.join('; ') : NO_SPECIAL;
}

const MILLISECONDS_PER_SECOND = 1000;

/** Talent reloads step by 50 ms, so the table keeps two decimals (0.35s, not 0.3s). */
function formatReload(durationMs: number): string {
  return `${Number((durationMs / MILLISECONDS_PER_SECOND).toFixed(2))}s`;
}

function formatGradeDamage(damage: number, damageType: DamageType): string {
  return damageType === DamageType.PERCENT ? formatPercentOfMaxHealth(damage) : String(damage);
}

function mapGrade(grade: TowerUpgradeLevel, damageType: DamageType): TowerBranchGradeViewModel {
  const { stats } = grade;
  // A support grade without an attack: its numbers are placeholders, not stats.
  const attacks = stats.damage > 0;

  return {
    level: grade.level,
    upgradeCost: grade.upgradeCostGold,
    damage: attacks ? formatGradeDamage(stats.damage, damageType) : NO_SPECIAL,
    range: attacks ? String(Number(stats.range.toFixed(1))) : NO_SPECIAL,
    cooldown: attacks ? formatReload(stats.attackCooldownMs) : NO_SPECIAL,
    special: describeGradeSpecial(stats),
  };
}

export function mapTalentBranch(
  branch: TowerTalentBranchDefinition,
  damageType: DamageType,
): TowerBranchViewModel {
  return {
    id: branch.id,
    name: branch.name,
    description: branch.description,
    grades: branch.grades.map((grade) => mapGrade(grade, damageType)),
  };
}
