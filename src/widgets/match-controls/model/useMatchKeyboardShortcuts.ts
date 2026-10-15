import { useEffect } from 'react';
import { resolveMatchShortcut, type MatchShortcutAction } from './matchKeyboardShortcuts';

export type MatchShortcutHandlers = {
  onAction: (action: MatchShortcutAction) => void;
  /** While false (a dialog is open, the match is over) the keys do nothing. */
  isEnabled: boolean;
};

/**
 * Window-level keyboard map for the match controls: Space/P pause, 1/2 speed,
 * Escape asks to quit. Keys typed into a text field are left alone.
 */
export function useMatchKeyboardShortcuts({ onAction, isEnabled }: MatchShortcutHandlers): void {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) {
        return;
      }
      const focused = document.activeElement;
      const target =
        focused instanceof HTMLElement
          ? { tagName: focused.tagName, isContentEditable: focused.isContentEditable }
          : null;
      const action = resolveMatchShortcut(event, target);
      if (!action) {
        return;
      }
      // Space would otherwise scroll the control strip.
      event.preventDefault();
      onAction(action);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onAction, isEnabled]);
}
