/** Folder of the per-tower icons cut by tools/slice-portraits.py. */
const TOWER_ICON_DIRECTORY = '/assets/ui/tower-icons';

/** Public URL of a race tower's painted icon; the file name is the tower id from content. */
export function toTowerIconSource(towerId: string): string {
  return `${TOWER_ICON_DIRECTORY}/${towerId}.webp`;
}
