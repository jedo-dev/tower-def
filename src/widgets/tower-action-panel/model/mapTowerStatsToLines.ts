import type { TowerCombatStats } from '../../../entities/tower';

/**
 * One label/value pair of the tower panel's stat list. `shortLabel` is the
 * compact visual label, `name` the full stat name assistive tech announces.
 */
export type TowerStatLine = {
  key: TowerStatKey;
  shortLabel: string;
  name: string;
  value: string;
};

export type TowerStatKey = 'damage' | 'range' | 'cooldown' | 'splash';

export function formatTowerRange(range: number): string {
  return range.toFixed(1);
}

export function formatTowerCooldown(cooldownMs: number): string {
  return `${cooldownMs}ms`;
}

export function mapTowerStatsToLines(stats: TowerCombatStats): TowerStatLine[] {
  const lines: TowerStatLine[] = [
    { key: 'damage', shortLabel: 'DMG', name: 'Damage', value: String(stats.damage) },
    { key: 'range', shortLabel: 'RNG', name: 'Range', value: formatTowerRange(stats.range) },
    {
      key: 'cooldown',
      shortLabel: 'SPD',
      name: 'Attack cooldown',
      value: formatTowerCooldown(stats.attackCooldownMs),
    },
  ];

  if (stats.splashRadius !== undefined) {
    lines.push({
      key: 'splash',
      shortLabel: 'AOE',
      name: 'Splash radius',
      value: formatTowerRange(stats.splashRadius),
    });
  }

  return lines;
}
