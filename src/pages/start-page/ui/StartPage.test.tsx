// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { COMING_SOON_LABEL, StartPage } from './StartPage';

afterEach(() => {
  cleanup();
});

describe('StartPage', () => {
  it('has no Exit control and marks unbuilt actions as coming soon', () => {
    const consoleError = vi.spyOn(console, 'error');
    const onNavigate = vi.fn();
    render(<StartPage onNavigate={onNavigate} />);

    expect(screen.queryByRole('button', { name: /exit/i })).toBeNull();

    const achievements = screen.getByRole('button', { name: /achievements/i });
    const favorites = screen.getByRole('button', { name: /favorites/i });
    for (const button of [achievements, favorites]) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('title')).toBe(COMING_SOON_LABEL);
      expect(button.getAttribute('aria-label')).toContain(COMING_SOON_LABEL);
      fireEvent.click(button);
    }
    expect(onNavigate).not.toHaveBeenCalled();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('routes every live control to its screen', () => {
    const consoleError = vi.spyOn(console, 'error');
    const onNavigate = vi.fn();
    render(<StartPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bestiary' }));
    const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
    expect(settingsButtons).toHaveLength(2);
    settingsButtons.forEach((button) => fireEvent.click(button));

    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual([
      'setup',
      'bestiary',
      'settings',
      'settings',
    ]);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
