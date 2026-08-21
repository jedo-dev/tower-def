/**
 * Single logging entrypoint. Everything that wants to talk to the console goes
 * through here, so log noise can be silenced, routed or tested in one place.
 */

export type DevLogScope = 'assets' | 'audio' | 'scene';

function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function logDevWarning(scope: DevLogScope, message: string, details?: unknown): void {
  if (!isDevelopment()) {
    return;
  }

  if (details === undefined) {
    console.warn(`[${scope}] ${message}`);
    return;
  }

  console.warn(`[${scope}] ${message}`, details);
}

export function logDevInfo(scope: DevLogScope, message: string, details?: unknown): void {
  if (!isDevelopment()) {
    return;
  }

  if (details === undefined) {
    console.info(`[${scope}] ${message}`);
    return;
  }

  console.info(`[${scope}] ${message}`, details);
}
