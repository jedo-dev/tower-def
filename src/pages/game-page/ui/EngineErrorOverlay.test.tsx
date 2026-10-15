// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { onGameCommand, publishGameEvent } from '../../../shared/lib/game-bridge/bridge';
import { ENGINE_ERROR_TITLE, EngineErrorOverlay } from './EngineErrorOverlay';

describe('EngineErrorOverlay', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  it('stays hidden until the engine reports an error', () => {
    render(<EngineErrorOverlay onExit={() => undefined} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the error with restart and menu actions, and clears on the next match start', () => {
    const onExit = vi.fn();
    const restarts: number[] = [];
    const unsubscribe = onGameCommand('restart-match', () => restarts.push(1));
    render(<EngineErrorOverlay onExit={onExit} />);

    act(() =>
      publishGameEvent('engine-error', { phase: 'update', message: 'tower targeting exploded' }),
    );

    const dialog = screen.getByRole('dialog', { name: ENGINE_ERROR_TITLE });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByRole('alert').textContent).toContain('tower targeting exploded (update)');

    fireEvent.click(screen.getByRole('button', { name: 'Restart run' }));
    expect(restarts).toHaveLength(1);
    // Still shown until the engine confirms the fresh match.
    expect(screen.getByRole('dialog')).toBeDefined();

    act(() => publishGameEvent('match-started', { trigger: 'restart' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => publishGameEvent('engine-error', { phase: 'boot', message: 'no canvas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(onExit).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
    unsubscribe();
  });
});
