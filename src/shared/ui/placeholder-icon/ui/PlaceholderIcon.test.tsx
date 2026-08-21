// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PlaceholderIcon, PLACEHOLDER_ICON_GLYPH } from './PlaceholderIcon';
import { FACTION_THEME_COLOR_VARS } from '../../../constants/theme';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PlaceholderIcon', () => {
  it('renders the question mark with an accessible label', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<PlaceholderIcon label="Frost Tower" />);

    const icon = screen.getByRole('img', { name: 'Frost Tower: artwork pending' });

    expect(icon.textContent).toBe(PLACEHOLDER_ICON_GLYPH);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('carries the race accent as a custom property, never a raw colour', () => {
    render(<PlaceholderIcon label="Moon Archer" faction="elf" />);

    const icon = screen.getByRole('img', { name: 'Moon Archer: artwork pending' });

    expect(icon.style.getPropertyValue('--placeholder-icon-accent'))
      .toBe(FACTION_THEME_COLOR_VARS.elf);
    expect(icon.getAttribute('style')).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('leaves the accent unset when the content has no race', () => {
    render(<PlaceholderIcon label="Unknown" />);

    expect(screen.getByRole('img', { name: 'Unknown: artwork pending' }).getAttribute('style'))
      .toBeNull();
  });

  it('claims a touch target when it stands alone inside a control', () => {
    const { container } = render(<PlaceholderIcon label="Plague" interactive />);
    const icon = container.firstElementChild as HTMLElement;

    expect(icon.className).toMatch(/iconInteractive/);
  });
});
