/** Which roster of a race the open codex entry belongs to. */
export type CodexEntryKind = 'tower' | 'creep';

/** The entry the detail view shows: a position in one roster of the selected race. */
export type CodexEntryRef = {
  kind: CodexEntryKind;
  index: number;
};

/**
 * The neighbour `step` places away in a roster of `count` entries; the
 * roster wraps, so the first tower's previous entry is the last tower.
 */
export function stepCodexEntry(entry: CodexEntryRef, step: number, count: number): CodexEntryRef {
  if (count <= 0) {
    return entry;
  }
  return { kind: entry.kind, index: (((entry.index + step) % count) + count) % count };
}
