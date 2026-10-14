import { createRetryableLazy } from '../../shared/lib/lazy-component/createRetryableLazy';
import type { BestiaryPageProps } from './ui/BestiaryPage';

/**
 * The bestiary in its own chunk: the unit and tower content it renders is
 * only downloaded when a player opens the codex, so the start menu stays lean.
 */
export const bestiaryPageChunk = createRetryableLazy<BestiaryPageProps>(() =>
  import('./ui/BestiaryPage').then((module) => module.BestiaryPage),
);

/** Forgets a failed download so the next visit retries it. */
export const resetBestiaryPageLoad: () => void = bestiaryPageChunk.resetFailedLoad;
