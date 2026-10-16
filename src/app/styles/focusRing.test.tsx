// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import globalCss from './global.css?raw';
import uiKitCss from './ui-kit.css?raw';

afterEach(() => {
  document.head.querySelectorAll('style[data-test-css]').forEach((style) => style.remove());
});

function findRule(source: string, selector: string): CSSStyleRule {
  const style = document.createElement('style');
  style.setAttribute('data-test-css', '');
  style.textContent = source;
  document.head.appendChild(style);
  const rule = Array.from(style.sheet?.cssRules ?? []).find(
    (candidate): candidate is CSSStyleRule =>
      candidate instanceof CSSStyleRule && candidate.selectorText === selector,
  );
  if (rule === undefined) {
    throw new Error(`no rule for ${selector}`);
  }
  return rule;
}

describe('kit focus ring', () => {
  it('defines the outline ring tokens', () => {
    const root = findRule(globalCss, ':root');
    expect(root.style.getPropertyValue('--focus-ring-outline')).toContain('solid');
    expect(root.style.getPropertyValue('--focus-ring-outline-offset').trim()).not.toBe('');
  });

  it.each(['.ui-btn-small:focus-visible', '.ui-slot:focus-visible'])(
    'gives %s a visible outline ring',
    (selector) => {
      // Kit chrome is border-image and selected slots already carry a gold
      // box-shadow, so the focus ring is an outline that paints on top.
      const rule = findRule(uiKitCss, selector);
      expect(rule.style.getPropertyValue('outline')).toBe('var(--focus-ring-outline)');
      expect(rule.style.getPropertyValue('outline-offset')).toBe(
        'var(--focus-ring-outline-offset)',
      );
    },
  );
});
