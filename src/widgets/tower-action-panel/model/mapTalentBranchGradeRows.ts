import {
  getTowerArchetype,
  type TowerAbilities,
  type TowerLevelStats,
  type TowerTalentBranchDefinition,
} from '../../../entities/tower';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import { mapTowerEffectUpgradeDeltas } from './mapTowerEffectsToLines';

/**
 * One row of a branch card's grade table: what grade 4-7 of the branch
 * changes against the grade-3 tower the player is about to develop.
 */
export type TalentGradeRow = {
  level: number;
  damageDelta: string;
  rangeDelta: string;
  cooldownDelta: string;
  /** Abilities, effects, aura or chain of the grade, joined on one line; `—` without any. */
  special: string;
};

/** Shown for an unchanged stat and for a grade with nothing special. */
export const NO_CHANGE_MARK = '—';
const SPECIAL_SEPARATOR = ' · ';
const STAT_EPSILON = 1e-6;
const MILLISECONDS_PER_SECOND = 1000;

function formatDelta(difference: number, fractionDigits: number, unit = ''): string {
  if (Math.abs(difference) < STAT_EPSILON) {
    return NO_CHANGE_MARK;
  }
  const sign = difference > 0 ? '+' : '-';
  return `${sign}${Math.abs(difference).toFixed(fractionDigits)}${unit}`;
}

function formatMultiplier(multiplier: number): string {
  return `x${Number(multiplier.toFixed(2))}`;
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Every ability the grade carries, in a fixed order, as short phrases. */
export function describeTowerAbilities(abilities: TowerAbilities | undefined): string[] {
  if (abilities === undefined) {
    return [];
  }

  const phrases: string[] = [];

  if (abilities.critEveryNthShot !== undefined) {
    const multiplier = formatMultiplier(abilities.critMultiplier ?? 1);
    phrases.push(`Crit ${multiplier} every ${abilities.critEveryNthShot}`);
  }
  if (abilities.extraTargets !== undefined) {
    const share = abilities.extraTargetDamageShare ?? 1;
    const shareSuffix = share < 1 ? ` at ${formatPercent(share)}` : '';
    phrases.push(`+${abilities.extraTargets} targets${shareSuffix}`);
  }
  if (abilities.pierceLine !== undefined) {
    phrases.push(`Pierce ${formatPercent(abilities.pierceLine)}`);
  }
  if (abilities.coneDegrees !== undefined) {
    phrases.push(`Cone ${abilities.coneDegrees}°`);
  }
  if (abilities.airDamageMultiplier !== undefined) {
    phrases.push(`${formatMultiplier(abilities.airDamageMultiplier)} vs air`);
  }
  if (abilities.groundDamageMultiplier !== undefined) {
    phrases.push(`${formatMultiplier(abilities.groundDamageMultiplier)} vs ground`);
  }
  if (abilities.fullHealthBonusMultiplier !== undefined) {
    phrases.push(`${formatMultiplier(abilities.fullHealthBonusMultiplier)} vs full HP`);
  }
  if (abilities.largeTargetMultiplier !== undefined) {
    phrases.push(`${formatMultiplier(abilities.largeTargetMultiplier)} vs large`);
  }
  if (abilities.minRangeCells !== undefined) {
    phrases.push(`Min range ${abilities.minRangeCells}`);
  }
  if (abilities.volleyEveryMs !== undefined) {
    const seconds = (abilities.volleyEveryMs / MILLISECONDS_PER_SECOND).toFixed(1);
    phrases.push(`Volley ${formatPercent(abilities.volleyDamageShare ?? 1)} / ${seconds}s`);
  }

  return phrases;
}

function describeChainChange(towerType: TowerTypeId, grade: TowerLevelStats): string[] {
  const authored = grade.chain;
  const base = getTowerArchetype(towerType).chain;
  if (
    authored === undefined ||
    (base !== undefined &&
      base.bounces === authored.bounces &&
      base.damageFalloff === authored.damageFalloff)
  ) {
    return [];
  }
  return [`Chain ${authored.bounces} jumps -${formatPercent(authored.damageFalloff)}`];
}

/**
 * The one-line "special" of a grade: its abilities, then the effects and
 * aura that differ from grade 3, then a chain shape the grade re-authors.
 */
export function describeGradeSpecial(
  towerType: TowerTypeId,
  gradeThreeStats: TowerLevelStats,
  grade: TowerLevelStats,
): string {
  const effectPhrases = mapTowerEffectUpgradeDeltas(towerType, gradeThreeStats, grade).map(
    (line) => `${line.label} ${line.value}`,
  );
  const phrases = [
    ...(grade.allowedTargets === undefined ? [] : [`Targets ${grade.allowedTargets}`]),
    ...describeTowerAbilities(grade.abilities),
    ...effectPhrases,
    ...describeChainChange(towerType, grade),
  ];
  return phrases.length === 0 ? NO_CHANGE_MARK : phrases.join(SPECIAL_SEPARATOR);
}

export function mapTalentBranchGradeRows(
  towerType: TowerTypeId,
  gradeThreeStats: TowerLevelStats,
  branch: Pick<TowerTalentBranchDefinition, 'grades'>,
): TalentGradeRow[] {
  return branch.grades.map(({ level, stats }) => ({
    level,
    damageDelta: formatDelta(stats.damage - gradeThreeStats.damage, 0),
    rangeDelta: formatDelta(stats.range - gradeThreeStats.range, 1),
    cooldownDelta: formatDelta(stats.attackCooldownMs - gradeThreeStats.attackCooldownMs, 0, 'ms'),
    special: describeGradeSpecial(towerType, gradeThreeStats, stats),
  }));
}
