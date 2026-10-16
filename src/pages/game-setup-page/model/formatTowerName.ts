/** Readable starter-tower label from a tower id (`undead_ghoul_tower` -> `Ghoul`). */
export function formatTowerName(towerId: string | undefined): string {
  if (!towerId) {
    return 'None';
  }

  return towerId
    .replace(/_tower$/i, '')
    .split('_')
    .filter((chunk) => chunk.length > 0 && chunk.toLowerCase() !== 'undead')
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
}
