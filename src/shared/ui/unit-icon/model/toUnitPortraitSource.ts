/** Folder of the per-unit portraits cut by tools/slice-portraits.py. */
const UNIT_PORTRAIT_DIRECTORY = '/assets/ui/portraits';

/** Public URL of a unit's painted portrait; the file name is the unit id from content. */
export function toUnitPortraitSource(unitId: string): string {
  return `${UNIT_PORTRAIT_DIRECTORY}/${unitId}.webp`;
}
