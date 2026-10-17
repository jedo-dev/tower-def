// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import {
  onGameCommand,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { RaceId } from '../../../shared/types/content-ids';
import { injectCssModule } from '../../../shared/test/injectCssModule';
import { MATCH_STATUS_LABEL, MatchStatusBar } from './MatchStatusBar';
import styles from './MatchStatusBar.module.css';
import statusBarCss from './MatchStatusBar.module.css?raw';

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.UNDEAD,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 335,
    income: 50,
    lives: 20,
    opponentGold: 400,
    opponentIncome: 80,
    opponentLives: 18,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 6,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
    autoStartSecondsLeft: 28,
    waveQueue: [],
    playerSendQueue: [],
    opponentSendQueue: [],
    pendingCreepCount: 0,
    isPaused: false,
    gameSpeed: 1,
    towerBranchChoices: {},
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
    ...overrides,
  };
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
let injectedStyles: { remove: () => void } | null = null;

afterEach(() => {
  cleanup();
  injectedStyles?.remove();
  injectedStyles = null;
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('MatchStatusBar', () => {
  it('renders gold with income, both sides of lives and the start button with its countdown', () => {
    publishGameHudSnapshot(createSnapshot());
    render(<MatchStatusBar setup={SETUP} />);

    const bar = screen.getByRole('region', { name: MATCH_STATUS_LABEL });
    expect(within(bar).getByText('335')).toBeDefined();
    expect(within(bar).getByText('+50/wave')).toBeDefined();
    expect(bar.querySelector('[data-player-lives]')?.textContent).toBe('20');
    expect(bar.querySelector('[data-enemy-lives]')?.textContent).toBe('18');
    expect(
      within(bar).getByRole('group', { name: /^Your lives 20, enemy lives 18/ }),
    ).toBeDefined();

    const start = within(bar).getByRole('button', { name: /^Start wave 6/ });
    expect(start.textContent).toBe('Start wave 6auto in 0:28');
    expect((start as HTMLButtonElement).disabled).toBe(false);
  });

  it('paints the enemy lives in the enemy race colour token', () => {
    publishGameHudSnapshot(createSnapshot());
    render(<MatchStatusBar setup={{ ...SETUP, enemyFaction: RaceId.ELF }} />);

    const lives = screen.getByRole('group', { name: /^Your lives/ });
    expect(lives.style.getPropertyValue('--status-enemy-color')).toBe('var(--color-faction-elf)');
  });

  it('names the matchup and the enemy economy in the duel tooltip', () => {
    publishGameHudSnapshot(createSnapshot());
    render(<MatchStatusBar setup={SETUP} />);

    const duel = screen.getByRole('group', { name: /^Your lives/ }).parentElement!;
    expect(duel.getAttribute('title')).toBe(
      'Undead vs Orc · Normal\nEnemy: 18 lives, 400 gold, +80/wave',
    );
  });

  it('keeps the enemy sends status reachable without growing the bar', () => {
    publishGameHudSnapshot(
      createSnapshot({
        opponentSendQueue: [
          { creepTypeId: 'orc_grunt', index: 0 },
          { creepTypeId: 'orc_grunt', index: 1 },
        ],
      }),
    );
    render(<MatchStatusBar setup={SETUP} />);

    const pressure = screen.getByRole('status', { name: /^Enemy sends 2/ });
    expect(pressure.textContent).toBe('Enemy sends 2Queued for next wave');
    expect(pressure.getAttribute('title')).toBe('Queued for next wave');
  });

  it('sends start-wave and leaves out the countdown when there is none', () => {
    publishGameHudSnapshot(createSnapshot({ autoStartSecondsLeft: null }));
    const startWave = vi.fn();
    const unsubscribe = onGameCommand('start-wave', startWave);
    render(<MatchStatusBar setup={SETUP} />);

    const start = screen.getByRole('button', { name: 'Start wave 6' });
    fireEvent.click(start);

    expect(startWave).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('disables Start Wave when the engine says the wave cannot start', () => {
    publishGameHudSnapshot(createSnapshot({ canStartWave: false }));
    render(<MatchStatusBar setup={SETUP} />);

    expect(
      (screen.getByRole('button', { name: /^Start wave 6/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('swaps Start Wave for the battlefield view toggle during the wave', () => {
    publishGameHudSnapshot(
      createSnapshot({ phase: 'wave', canStartWave: false, pendingCreepCount: 6 }),
    );
    const switchView = vi.fn();
    const unsubscribe = onGameCommand('switch-battlefield-view', switchView);
    render(<MatchStatusBar setup={SETUP} />);

    expect(screen.queryByRole('button', { name: /^Start wave/ })).toBeNull();
    expect(screen.getByRole('status', { name: /^Incoming 6/ })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Show opponent battlefield' }));

    expect(switchView).toHaveBeenCalledWith({ view: 'opponent' });
    unsubscribe();
  });

  it('sizes the wave action to the shared touch target and keeps its label on one line', () => {
    injectedStyles = injectCssModule(statusBarCss, styles);
    publishGameHudSnapshot(createSnapshot());
    render(<MatchStatusBar setup={SETUP} />);

    const start = screen.getByRole('button', { name: /^Start wave 6/ });
    expect(getComputedStyle(start).minHeight).toBe('var(--touch-target-min)');
    const label = start.querySelector(`.${styles.actionLabel}`) as HTMLElement;
    expect(getComputedStyle(label).whiteSpace).toBe('nowrap');
    const bar = screen.getByRole('region', { name: MATCH_STATUS_LABEL });
    expect(getComputedStyle(bar).height).toBe('var(--match-status-height)');
  });
});
