// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listFocusableElements, makeSiblingsInert, trapTabKey } from './focusTrap';

function mountDialog(innerHtml: string): HTMLElement {
  const dialog = document.createElement('div');
  dialog.tabIndex = -1;
  dialog.innerHTML = innerHtml;
  document.body.appendChild(dialog);
  return dialog;
}

describe('focusTrap helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists only enabled, tabbable controls', () => {
    const dialog = mountDialog(
      '<button id="a"></button><button id="b" disabled></button><div tabindex="-1" id="c"></div><a href="#" id="d"></a>',
    );

    expect(listFocusableElements(dialog).map((element) => element.id)).toEqual(['a', 'd']);
  });

  it('swallows Tab when the dialog has nothing to focus', () => {
    const dialog = mountDialog('<p>nothing here</p>');
    const preventDefault = vi.fn();

    trapTabKey(dialog, { key: 'Tab', shiftKey: false, preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('ignores keys other than Tab', () => {
    const dialog = mountDialog('<button id="a"></button>');
    const preventDefault = vi.fn();

    trapTabKey(dialog, { key: 'Enter', shiftKey: false, preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('leaves siblings that were already inert untouched on restore', () => {
    const parent = document.createElement('div');
    parent.innerHTML =
      '<div id="already" inert></div><div id="fresh"></div><div id="dialog"></div>';
    document.body.appendChild(parent);
    const dialog = parent.querySelector<HTMLElement>('#dialog') as HTMLElement;

    const handle = makeSiblingsInert(dialog);
    expect(parent.querySelector('#fresh')?.hasAttribute('inert')).toBe(true);

    handle.restore();
    expect(parent.querySelector('#fresh')?.hasAttribute('inert')).toBe(false);
    expect(parent.querySelector('#already')?.hasAttribute('inert')).toBe(true);
  });
});
