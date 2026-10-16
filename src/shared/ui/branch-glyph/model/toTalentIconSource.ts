/** Folder of the per-branch talent icons cut by tools/slice-talent-icons.py. */
const TALENT_ICON_DIRECTORY = '/assets/ui/talents';

/** Public URL of a talent branch's icon; the file name is the branch id from content. */
export function toTalentIconSource(branchId: string): string {
  return `${TALENT_ICON_DIRECTORY}/${branchId}.webp`;
}
