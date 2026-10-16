// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { onGameCommand, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameCommandMap, GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { injectCssModule } from '../../../shared/test/injectCssModule';
import { MatchControls } from './MatchControls';
import styles from './MatchControls.module.css';
import matchControlsCss from './MatchControls.module.css?raw';
import { QUIT_DIALOG_TITLE } from './QuitMatchDialog';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 500,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 2,
    phase: 'wave',
    canStartWave: false,
    selectedTowerType: null,
    selectedFaction: 'undead',
    autoStartSecondsLeft: null,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices: {},
    ...overrides,
  };
}

type SentCommand = { name: keyof GameCommandMap; payload: unknown };

describe('MatchControls', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let sent: SentCommand[] = [];
  let unsubscribe: Array<() => void> = [];

  beforeEach(() => {
    sent = [];
    unsubscribe = [
      onGameCommand('set-paused', (payload) => sent.push({ name: 'set-paused', payload })),
      onGameCommand('set-game-speed', (payload) => sent.push({ name: 'set-game-speed', payload })),
      onGameCommand('quit-match', (payload) => sent.push({ name: 'quit-match', payload })),
      onGameCommand('zoom-board', (payload) => sent.push({ name: 'zoom-board', payload })),
    ];
    publishGameHudSnapshot(createSnapshot());
  });

  afterEach(() => {
    unsubscribe.forEach((stop) => stop());
    cleanup();
    consoleError.mockClear();
  });

  it('renders labelled toggles that mirror the engine state', () => {
    render(<MatchControls />);

    const pause = screen.getByRole('button', { name: 'Pause game' });
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Game speed 1x' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Game speed 2x' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Quit to menu' })).toBeDefined();

    act(() => publishGameHudSnapshot(createSnapshot({ isPaused: true, gameSpeed: 2 })));

    expect(screen.getByRole('button', { name: 'Resume game' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Game speed 2x' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('sends typed pause and speed commands from the buttons', () => {
    render(<MatchControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Game speed 2x' }));

    expect(sent).toEqual([
      { name: 'set-paused', payload: { isPaused: true } },
      { name: 'set-game-speed', payload: { speed: 2 } },
    ]);
  });

  it('maps Space/P, 1/2 and Escape on the window', () => {
    render(<MatchControls />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    fireEvent.keyDown(window, { key: 'p', code: 'KeyP' });
    fireEvent.keyDown(window, { key: '2', code: 'Digit2' });
    fireEvent.keyDown(window, { key: '1', code: 'Digit1' });

    expect(sent).toEqual([
      { name: 'set-paused', payload: { isPaused: true } },
      { name: 'set-paused', payload: { isPaused: true } },
      { name: 'set-game-speed', payload: { speed: 2 } },
      { name: 'set-game-speed', payload: { speed: 1 } },
    ]);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog', { name: QUIT_DIALOG_TITLE })).toBeDefined();
  });

  it('maps +/- and 0 to typed board zoom commands', () => {
    render(<MatchControls />);

    fireEvent.keyDown(window, { key: '+', code: 'Equal' });
    fireEvent.keyDown(window, { key: '-', code: 'Minus' });
    fireEvent.keyDown(window, { key: '0', code: 'Digit0' });

    expect(sent).toEqual([
      { name: 'zoom-board', payload: { action: 'in' } },
      { name: 'zoom-board', payload: { action: 'out' } },
      { name: 'zoom-board', payload: { action: 'reset' } },
    ]);
  });

  it('leaves keys typed into an input alone', () => {
    render(
      <>
        <input aria-label="chat" />
        <MatchControls />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'chat' });
    input.focus();

    fireEvent.keyDown(input, { key: 'p', code: 'KeyP' });
    fireEvent.keyDown(input, { key: '2', code: 'Digit2' });

    expect(sent).toEqual([]);
  });

  it('quits only after the confirmation, and Escape cancels the dialog', () => {
    render(<MatchControls />);

    const quitButton = screen.getByRole('button', { name: 'Quit to menu' });
    quitButton.focus();
    fireEvent.click(quitButton);
    const dialog = screen.getByRole('dialog', { name: QUIT_DIALOG_TITLE });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(sent).toEqual([]);

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(quitButton);

    fireEvent.click(screen.getByRole('button', { name: 'Quit to menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Quit to menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave match' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sent).toEqual([{ name: 'quit-match', payload: undefined }]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables the shortcuts once the match is over', () => {
    publishGameHudSnapshot(
      createSnapshot({
        matchOutcome: { status: 'player-lost', winner: 'orc', reason: 'knockout' },
        phase: 'game-over',
      }),
    );
    render(<MatchControls />);

    fireEvent.keyDown(window, { key: 'p', code: 'KeyP' });
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(sent).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps every control at the 44px touch target', () => {
    const injected = injectCssModule(matchControlsCss, styles);
    render(<MatchControls />);

    const group = screen.getByRole('group', { name: 'Match controls' });
    const buttons = group.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    buttons.forEach((button) => {
      const style = getComputedStyle(button);
      expect(style.minWidth).toBe('var(--touch-target-min)');
      expect(style.minHeight).toBe('var(--touch-target-min)');
    });
    injected.remove();
  });

  it('lays out in flow, never as an absolute overlay over the board', () => {
    const injected = injectCssModule(matchControlsCss, styles);
    render(<MatchControls />);

    const style = getComputedStyle(screen.getByRole('group', { name: 'Match controls' }));
    expect(style.position).not.toBe('absolute');
    expect(style.position).not.toBe('fixed');
    expect(style.display).toBe('flex');
    expect(consoleError).not.toHaveBeenCalled();
    injected.remove();
  });
});
