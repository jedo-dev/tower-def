// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BranchGlyph } from './BranchGlyph';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('BranchGlyph', () => {
  it('shows the Roman numeral when no branch id is given', () => {
    render(<BranchGlyph glyph="II" />);

    const glyph = screen.getByTestId('branch-glyph');
    expect(glyph.textContent).toBe('II');
    expect(glyph.querySelector('img')).toBeNull();
  });

  it('shows the branch icon by its content id', () => {
    render(<BranchGlyph glyph="I" branchId="orc_grunt_rage" size="large" />);

    const image = screen.getByTestId('branch-glyph').querySelector('img');
    expect(image?.getAttribute('src')).toBe('/assets/ui/talents/orc_grunt_rage.webp');
    expect(image?.getAttribute('alt')).toBe('');
  });

  it('falls back to the Roman numeral when the icon fails to load', () => {
    render(<BranchGlyph glyph="I" branchId="missing_branch" />);

    const glyph = screen.getByTestId('branch-glyph');
    const image = glyph.querySelector('img');
    if (!image) throw new Error('icon not rendered');
    fireEvent.error(image);

    expect(glyph.querySelector('img')).toBeNull();
    expect(glyph.textContent).toBe('I');
  });
});
