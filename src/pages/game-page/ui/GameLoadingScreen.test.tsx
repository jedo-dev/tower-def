// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GAME_LOADING_LABEL, GameLoadingScreen } from './GameLoadingScreen';

describe('GameLoadingScreen', () => {
  it('announces the loading state to assistive technology', () => {
    const consoleError = vi.spyOn(console, 'error');

    render(<GameLoadingScreen />);

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe(GAME_LOADING_LABEL);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
