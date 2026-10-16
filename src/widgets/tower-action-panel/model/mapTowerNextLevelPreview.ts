import { resolveTowerChain, type TowerCombatStats } from '../../../entities/tower';
import type { TowerTypeId } from '../../../shared/types/content-ids';
import { mapTowerEffectUpgradeDeltas, type TowerEffectLine } from './mapTowerEffectsToLines';
import {
  mapTowerStatsToLines,
  type TowerStatKey,
  type TowerStatLine,
} from './mapTowerStatsToLines';

/** A stat the next level changes: its new value and the signed difference. */
export type TowerStatDelta = TowerStatLine & {
  delta: string;
};

/**
 * The tower panel's "NEXT:" line: what paying for the upgrade buys, read
 * from the authored level curve. Unchanged stats and effects are left out.
 */
export type TowerNextLevelPreview = {
  level: number;
  statDeltas: TowerStatDelta[];
  effectLines: TowerEffectLine[];
};

type StatReading = {
  read: (stats: TowerCombatStats) => number | undefined;
  formatDelta: (difference: number) => string;
};

function formatSigned(difference: number, fractionDigits: number, unit = ''): string {
  const sign = difference > 0 ? '+' : '-';
  return `${sign}${Math.abs(difference).toFixed(fractionDigits)}${unit}`;
}

const STAT_READINGS: Record<TowerStatKey, StatReading> = {
  damage: {
    read: (stats) => stats.damage,
    formatDelta: (difference) => formatSigned(difference, 0),
  },
  range: {
    read: (stats) => stats.range,
    formatDelta: (difference) => formatSigned(difference, 1),
  },
  cooldown: {
    read: (stats) => stats.attackCooldownMs,
    formatDelta: (difference) => formatSigned(difference, 0, 'ms'),
  },
  splash: {
    read: (stats) => stats.splashRadius,
    formatDelta: (difference) => formatSigned(difference, 1),
  },
};

/** Changes below this are float noise from the authored decimals. */
const STAT_EPSILON = 1e-6;

function mapStatDeltas(current: TowerCombatStats, next: TowerCombatStats): TowerStatDelta[] {
  const deltas: TowerStatDelta[] = [];

  for (const line of mapTowerStatsToLines(next)) {
    const reading = STAT_READINGS[line.key];
    const nextValue = reading.read(next) ?? 0;
    const currentValue = reading.read(current) ?? 0;
    const difference = nextValue - currentValue;
    if (Math.abs(difference) > STAT_EPSILON) {
      deltas.push({ ...line, delta: reading.formatDelta(difference) });
    }
  }

  return deltas;
}

/**
 * Damage of each jump after the first hit at the next level, read from the
 * chain shape combat resolves at that level (a talent grade may author its
 * own bounces and falloff). Shown when the damage or the shape changes.
 */
function mapChainArcLine(
  towerType: TowerTypeId,
  current: TowerCombatStats,
  next: TowerCombatStats,
): TowerEffectLine | null {
  const chain = resolveTowerChain(towerType, next);
  const currentChain = resolveTowerChain(towerType, current);
  const isShapeUnchanged =
    currentChain !== undefined &&
    currentChain.bounces === chain?.bounces &&
    currentChain.bounceRangeCells === chain.bounceRangeCells &&
    currentChain.damageFalloff === chain.damageFalloff;
  if (!chain || chain.bounces <= 0 || (next.damage === current.damage && isShapeUnchanged)) {
    return null;
  }

  const arcDamages: number[] = [];
  let arcDamage = next.damage;
  for (let bounce = 0; bounce < chain.bounces; bounce += 1) {
    arcDamage *= 1 - chain.damageFalloff;
    arcDamages.push(Math.round(arcDamage));
  }

  return { key: 'chain-arcs', label: 'CHAIN', value: `jumps ${arcDamages.join('/')}` };
}

export function mapTowerNextLevelPreview(
  towerType: TowerTypeId,
  currentStats: TowerCombatStats,
  nextLevelStats: TowerCombatStats,
  nextLevel: number,
): TowerNextLevelPreview {
  const effectLines = mapTowerEffectUpgradeDeltas(towerType, currentStats, nextLevelStats);
  const chainArcLine = mapChainArcLine(towerType, currentStats, nextLevelStats);
  if (chainArcLine !== null) {
    effectLines.push(chainArcLine);
  }

  return {
    level: nextLevel,
    statDeltas: mapStatDeltas(currentStats, nextLevelStats),
    effectLines,
  };
}
