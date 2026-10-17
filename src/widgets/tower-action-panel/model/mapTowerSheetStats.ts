import type { TowerCombatStats } from '../../../entities/tower';
import type { TowerNextLevelPreview, TowerStatDelta } from './mapTowerNextLevelPreview';
import { formatTowerRange, type TowerStatKey } from './mapTowerStatsToLines';

/**
 * One stat tile of the tower sheet: the live value in the big face and, when
 * the next level changes it, the value it upgrades to.
 */
export type TowerSheetStatTile = {
  key: TowerStatKey;
  name: string;
  value: string;
  /** Value at the next level without its unit ("→ 0.85"); null when unchanged or maxed. */
  nextValue: string | null;
};

const MILLISECONDS_PER_SECOND = 1000;
/** Typographic minus: reads as a sign, not a dash, in the NEXT line. */
const MINUS_SIGN = '−';

function formatCooldownSeconds(cooldownMs: number): string {
  return (cooldownMs / MILLISECONDS_PER_SECOND).toFixed(2);
}

type SheetStatReading = {
  name: string;
  read: (stats: TowerCombatStats) => number | undefined;
  format: (value: number) => string;
  unit: string;
};

const SHEET_STAT_READINGS: Record<TowerStatKey, SheetStatReading> = {
  damage: { name: 'Damage', read: (stats) => stats.damage, format: String, unit: '' },
  range: { name: 'Range', read: (stats) => stats.range, format: formatTowerRange, unit: '' },
  cooldown: {
    name: 'Cooldown',
    read: (stats) => stats.attackCooldownMs,
    format: formatCooldownSeconds,
    unit: 's',
  },
  splash: {
    name: 'Splash',
    read: (stats) => stats.splashRadius,
    format: formatTowerRange,
    unit: '',
  },
};

/** Damage, range and cooldown always; splash only for a tower that has one. */
const SHEET_STAT_ORDER: readonly TowerStatKey[] = ['damage', 'range', 'cooldown', 'splash'];

/**
 * The sheet's stat tiles. `liveStats` are what the tower does now (auras
 * included); the preview's deltas say which stats the upgrade changes.
 */
export function mapTowerSheetStatTiles(
  liveStats: TowerCombatStats,
  nextLevelStats: TowerCombatStats | null,
  preview: TowerNextLevelPreview | null,
): TowerSheetStatTile[] {
  const changedKeys = new Set(preview?.statDeltas.map((delta) => delta.key) ?? []);
  const tiles: TowerSheetStatTile[] = [];

  for (const key of SHEET_STAT_ORDER) {
    const reading = SHEET_STAT_READINGS[key];
    const value = reading.read(liveStats);
    if (value === undefined) {
      continue;
    }
    const nextValue = nextLevelStats === null ? undefined : reading.read(nextLevelStats);
    tiles.push({
      key,
      name: reading.name,
      value: `${reading.format(value)}${reading.unit}`,
      nextValue: changedKeys.has(key) && nextValue !== undefined ? reading.format(nextValue) : null,
    });
  }

  return tiles;
}

function formatSignedDifference(difference: number, text: string): string {
  return `${difference > 0 ? '+' : MINUS_SIGN}${text}`;
}

/** "+7 damage", "+0.3 range", "−0.05s", "+0.5 splash". */
export function formatTowerSheetDelta(delta: TowerStatDelta): string {
  const magnitude = Math.abs(delta.difference);
  switch (delta.key) {
    case 'damage':
      return formatSignedDifference(delta.difference, `${magnitude.toFixed(0)} damage`);
    case 'range':
      return formatSignedDifference(delta.difference, `${magnitude.toFixed(1)} range`);
    case 'cooldown':
      return formatSignedDifference(delta.difference, `${formatCooldownSeconds(magnitude)}s`);
    case 'splash':
      return formatSignedDifference(delta.difference, `${magnitude.toFixed(1)} splash`);
  }
}

/** The one-line NEXT summary items: stat deltas first, then effect changes. */
export function mapTowerSheetNextItems(preview: TowerNextLevelPreview): string[] {
  return [
    ...preview.statDeltas.map(formatTowerSheetDelta),
    ...preview.effectLines.map((line) => `${line.label} ${line.value}`),
  ];
}
