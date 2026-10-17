const damageLabelStrings: string[] = [];

/**
 * The label for a damage value. Whole values under `cacheSize` come from a
 * table filled on first use, so steady combat stops building strings.
 */
export function formatDamageLabel(damage: number, cacheSize: number): string {
  if (!Number.isInteger(damage) || damage < 0 || damage >= cacheSize) {
    return `${damage}`;
  }
  const cached = damageLabelStrings[damage];
  if (cached !== undefined) {
    return cached;
  }
  const label = `${damage}`;
  damageLabelStrings[damage] = label;
  return label;
}

const tintByCssColor = new Map<string, number>();

/** `#rrggbb` as a 0xrrggbb tint, memoised per colour string. */
export function cssHexColorToTint(color: string): number {
  const cached = tintByCssColor.get(color);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = Number.parseInt(color.replace('#', ''), 16);
  const tint = Number.isFinite(parsed) ? parsed : 0xffffff;
  tintByCssColor.set(color, tint);
  return tint;
}
