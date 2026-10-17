import { useEffect } from 'react';

const ESCAPE_KEY = 'Escape';

/**
 * Escape closes the open tower sheet. The listener sits on the document in
 * the bubble phase: a dialog above the sheet (the branch chooser, the quit
 * prompt) handles and stops its own Escape first, and the sheet marks the
 * key handled so the window-level match shortcut does not also ask to quit.
 */
export function useEscapeToClose(isActive: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== ESCAPE_KEY || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isActive, onClose]);
}
