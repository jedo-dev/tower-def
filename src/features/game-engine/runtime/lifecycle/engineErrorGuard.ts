import type { EngineErrorPhase } from '../../../../shared/lib/game-bridge/types';
import { logError } from '../../../../shared/lib/logging/devLog';

export type EngineErrorReport = {
  phase: EngineErrorPhase;
  message: string;
  error: unknown;
};

export type EngineErrorHandler = (report: EngineErrorReport) => void;

export function describeThrownError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return 'Unexpected engine error';
}

/**
 * Runs one scene lifecycle step. A throw inside Phaser's `create`/`update` or
 * a bridge command handler would otherwise escape the game loop silently (no
 * React boundary sees it), so it is logged through the shared entrypoint and
 * handed to `onError`, which pauses the engine and tells the page.
 *
 * Returns whether the step completed.
 */
export function runGuardedEngineStep(
  phase: EngineErrorPhase,
  run: () => void,
  onError: EngineErrorHandler,
): boolean {
  try {
    run();
    return true;
  } catch (error) {
    const message = describeThrownError(error);
    logError('engine', `Scene ${phase} failed: ${message}`, error);
    onError({ phase, message, error });
    return false;
  }
}
