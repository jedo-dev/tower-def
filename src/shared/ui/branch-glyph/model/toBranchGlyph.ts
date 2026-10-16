/** Roman numerals for a tower's talent branches, in authored order. */
const BRANCH_GLYPHS = ['I', 'II', 'III', 'IV'] as const;

/**
 * Short mark of a talent branch, from its position in the tower's branch
 * list: branch names may share a first letter, positions never do.
 */
export function toBranchGlyph(branchIndex: number): string {
  return BRANCH_GLYPHS[branchIndex] ?? String(branchIndex + 1);
}
