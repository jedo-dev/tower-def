import type { BoardZoomAction, GameSpeed } from '../../../shared/lib/game-bridge/types';

export type MatchShortcutAction =
  | { kind: 'toggle-pause' }
  | { kind: 'set-speed'; speed: GameSpeed }
  | { kind: 'zoom-board'; action: BoardZoomAction }
  | { kind: 'request-quit' };

/** The subset of a keyboard event the resolver reads; pure and testable. */
export type MatchShortcutKeyEvent = {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
};

export type MatchShortcutFocusTarget = {
  tagName: string;
  isContentEditable: boolean;
};

/**
 * The match keyboard map. Pause: Space / P. Speed: 1 / 2. Board zoom: + (or
 * =, the unshifted key) zooms in, - zooms out, 0 resets to the whole board.
 * Quit: Escape.
 */
export enum MatchShortcutKey {
  PAUSE_SPACE = 'Space',
  PAUSE_LETTER = 'p',
  SPEED_NORMAL = '1',
  SPEED_FAST = '2',
  ZOOM_IN = '+',
  ZOOM_IN_UNSHIFTED = '=',
  ZOOM_OUT = '-',
  ZOOM_RESET = '0',
  QUIT = 'Escape',
}

const TEXT_ENTRY_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Space activates these natively; the shortcut must not fire a second action. */
const SPACE_ACTIVATED_TAGS: ReadonlySet<string> = new Set(['BUTTON', 'A', 'SUMMARY']);

export function isTextEntryTarget(target: MatchShortcutFocusTarget | null): boolean {
  if (!target) {
    return false;
  }
  return TEXT_ENTRY_TAGS.has(target.tagName.toUpperCase()) || target.isContentEditable;
}

/**
 * Maps a keydown to a match control, or `null` when the key means nothing
 * here or belongs to whatever has focus (a text field, a focused button on
 * Space). Modifier chords are left to the browser.
 */
export function resolveMatchShortcut(
  event: MatchShortcutKeyEvent,
  target: MatchShortcutFocusTarget | null,
): MatchShortcutAction | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  if (isTextEntryTarget(target)) {
    return null;
  }

  if (event.code === MatchShortcutKey.PAUSE_SPACE) {
    if (target && SPACE_ACTIVATED_TAGS.has(target.tagName.toUpperCase())) {
      return null;
    }
    return { kind: 'toggle-pause' };
  }

  switch (event.key.toLowerCase()) {
    case MatchShortcutKey.PAUSE_LETTER:
      return { kind: 'toggle-pause' };
    case MatchShortcutKey.SPEED_NORMAL:
      return { kind: 'set-speed', speed: 1 };
    case MatchShortcutKey.SPEED_FAST:
      return { kind: 'set-speed', speed: 2 };
    case MatchShortcutKey.ZOOM_IN:
    case MatchShortcutKey.ZOOM_IN_UNSHIFTED:
      return { kind: 'zoom-board', action: 'in' };
    case MatchShortcutKey.ZOOM_OUT:
      return { kind: 'zoom-board', action: 'out' };
    case MatchShortcutKey.ZOOM_RESET:
      return { kind: 'zoom-board', action: 'reset' };
    case MatchShortcutKey.QUIT.toLowerCase():
      return { kind: 'request-quit' };
    default:
      return null;
  }
}
