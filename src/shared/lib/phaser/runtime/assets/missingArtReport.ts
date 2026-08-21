import { logDevWarning } from '../../../logging/devLog';
import { setMissingArtListener, type SpriteKind } from './spriteKeyResolver';

export type MissingArtEntry = {
  kind: SpriteKind;
  requestedKey: string;
  /** Content that asked for the art, when the caller knows it. */
  contentIds: string[];
};

const entriesByKey = new Map<string, MissingArtEntry>();

function toEntryKey(kind: SpriteKind, requestedKey: string): string {
  return `${kind}:${requestedKey}`;
}

export function getMissingArtReport(): MissingArtEntry[] {
  return [...entriesByKey.values()].map((entry) => ({
    ...entry,
    contentIds: [...entry.contentIds],
  }));
}

export function clearMissingArtReport(): void {
  entriesByKey.clear();
}

export type MissingArtReportOptions = {
  /** Defaults to the Vite dev flag; injectable so tests do not depend on it. */
  isDevelopment?: boolean;
};

/**
 * Collects every sprite key that fell back to the placeholder so it is obvious
 * which art is still missing after adding content. Development only: in a
 * production build no listener is installed, so nothing is collected at all.
 */
export function startMissingArtReport(options?: MissingArtReportOptions): void {
  const isDevelopment = options?.isDevelopment ?? import.meta.env.DEV;

  if (!isDevelopment) {
    return;
  }

  clearMissingArtReport();
  setMissingArtListener(({ kind, requestedKey, contentId }) => {
    const entryKey = toEntryKey(kind, requestedKey);
    const existing = entriesByKey.get(entryKey);

    if (!existing) {
      entriesByKey.set(entryKey, {
        kind,
        requestedKey,
        contentIds: contentId ? [contentId] : [],
      });
      logDevWarning(
        'assets',
        `${kind} art missing, drawing placeholder: ${requestedKey}`,
        contentId ? { contentId } : undefined,
      );
      return;
    }

    // Each key is reported once; extra content ids still get recorded so the
    // report names everything affected by one missing file.
    if (contentId && !existing.contentIds.includes(contentId)) {
      existing.contentIds.push(contentId);
    }
  });
}

export function stopMissingArtReport(): void {
  setMissingArtListener(undefined);
}
