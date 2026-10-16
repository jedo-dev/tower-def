// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import fantasyButtonCss from './FantasyButton.css?raw';
import { FantasyButton } from './FantasyButton';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[data-test-css]').forEach((style) => style.remove());
  consoleError.mockClear();
});

function injectCss(source: string): CSSStyleSheet {
  const style = document.createElement('style');
  style.setAttribute('data-test-css', '');
  style.textContent = source;
  document.head.appendChild(style);
  const sheet = style.sheet;
  if (sheet === null) {
    throw new Error('stylesheet did not parse');
  }
  return sheet;
}

function findRule(sheet: CSSStyleSheet, selector: string): CSSStyleRule {
  const rule = Array.from(sheet.cssRules).find(
    (candidate): candidate is CSSStyleRule =>
      candidate instanceof CSSStyleRule && candidate.selectorText === selector,
  );
  if (rule === undefined) {
    throw new Error(`no rule for ${selector}`);
  }
  return rule;
}

describe('FantasyButton', () => {
  it('renders a native button with its tone class', () => {
    render(<FantasyButton tone="ember">Start</FantasyButton>);

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button.className).toContain('fantasy-button--ember');
    expect(button.getAttribute('type')).toBe('button');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('draws a visible outline ring on keyboard focus', () => {
    // The 9-slice glow (border-image outset) paints over a box-shadow ring,
    // so the button must use the outline ring, never `outline: none` alone.
    const rule = findRule(injectCss(fantasyButtonCss), '.fantasy-button:focus-visible');
    expect(rule.style.getPropertyValue('outline')).toBe('var(--focus-ring-outline)');
    expect(rule.style.getPropertyValue('outline-offset')).toBe('var(--focus-ring-outline-offset)');
  });
});
