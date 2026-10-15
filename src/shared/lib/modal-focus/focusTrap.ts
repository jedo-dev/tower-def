/**
 * Pure DOM helpers behind `useModalFocus`: what a modal must do with focus
 * and with the content it covers. Kept free of React so they stay unit
 * testable and reusable by any dialog-like widget.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function listFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Keeps Tab / Shift+Tab cycling inside `container`. Call it from the
 * container's keydown handler; it only acts on the Tab key.
 */
export type TabKeyEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
};

export function trapTabKey(container: HTMLElement, event: TabKeyEvent): void {
  if (event.key !== 'Tab') {
    return;
  }
  const focusable = listFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const isOutsideOrOnContainer = active === container || !container.contains(active);

  if (event.shiftKey && (active === first || isOutsideOrOnContainer)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || isOutsideOrOnContainer)) {
    event.preventDefault();
    first.focus();
  }
}

export type InertSiblingsHandle = {
  restore: () => void;
};

/**
 * Marks every sibling of `element` as `inert` so the covered content is
 * removed from the tab order, the accessibility tree and pointer hit
 * testing. Only siblings that were not already inert are restored.
 */
export function makeSiblingsInert(element: HTMLElement): InertSiblingsHandle {
  const parent = element.parentElement;
  if (!parent) {
    return { restore: () => undefined };
  }
  const changed: Element[] = [];
  for (const sibling of Array.from(parent.children)) {
    if (sibling === element || sibling.hasAttribute('inert')) {
      continue;
    }
    sibling.setAttribute('inert', '');
    changed.push(sibling);
  }
  return {
    restore: () => {
      for (const sibling of changed) {
        sibling.removeAttribute('inert');
      }
    },
  };
}
