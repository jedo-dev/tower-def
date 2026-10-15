import { useEffect, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { makeSiblingsInert, trapTabKey } from './focusTrap';

export type ModalFocusHandlers = {
  /** Attach to the dialog element's `onKeyDown` to keep Tab inside it. */
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

/**
 * Modal focus contract for a `role="dialog"` element:
 * - while `isActive`, focus moves into the dialog and its siblings are inert;
 * - Tab / Shift+Tab cycle within the dialog;
 * - when it closes, the siblings wake up and focus returns to where it was.
 *
 * The dialog element itself should carry `tabIndex={-1}` so it can take
 * focus before the user picks an action.
 */
export function useModalFocus(
  dialogRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): ModalFocusHandlers {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isActive || !dialog) {
      return;
    }
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inertSiblings = makeSiblingsInert(dialog);
    dialog.focus();

    return () => {
      inertSiblings.restore();
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [dialogRef, isActive]);

  return {
    onKeyDown: (event) => {
      if (event.currentTarget instanceof HTMLElement) {
        trapTabKey(event.currentTarget, event);
      }
    },
  };
}
