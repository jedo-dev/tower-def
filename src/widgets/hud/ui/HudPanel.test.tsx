// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getBuildableTowersByFaction } from '../../../entities/tower';
import { RaceId } from '../../../shared/types/content-ids';
import { EnemyFaction } from '../../../entities/enemy-faction';
import { Difficulty } from '../../../entities/difficulty';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { onGameCommand, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { BUILD_PHASE_ONLY_HINT, HudPanel } from './HudPanel';
import styles from './HudPanel.module.css';
import hudPanelCss from './HudPanel.module.css?raw';
import { injectCssModule } from '../../../shared/test/injectCssModule';

function createSnapshot(overrides?: Partial<GameHudSnapshot>): GameHudSnapshot {
  return {
    gold: 750,
    income: 65,
    lives: 18,
    opponentGold: 400,
    opponentIncome: 80,
    opponentLives: 14,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 5,
    phase: 'build',
    canStartWave: true,
    selectedTowerType: null,
    selectedFaction: 'orc',
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

describe('HudPanel render', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleError.mockClear();
  });

  it('renders resources and the duel readability row from the snapshot', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);

    expect(screen.getByText('750')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined();
    expect(screen.getByText('You +65')).toBeDefined();
    expect(screen.getByText('Enemy 14 HP · +80')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('expands to show enemy details without crashing', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    expect(screen.getByText('Enemy gold:')).toBeDefined();
    expect(screen.getByText('Orc')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse HUD' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables wave start while a wave is running', () => {
    publishGameHudSnapshot(createSnapshot({ phase: 'wave', canStartWave: false }));

    render(<HudPanel setup={null} />);

    // During a wave the center slot shows the battlefield view toggle.
    expect(screen.getByRole('button', { name: 'Show opponent battlefield' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('HudPanel build bar', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  function createSetup(builderFaction: RaceId): GameSetupConfig {
    return {
      builderFaction,
      enemyFaction: EnemyFaction.ORC,
      difficulty: Difficulty.NORMAL,
    };
  }

  afterEach(() => {
    cleanup();
    consoleError.mockClear();
  });

  it('lists every tower the chosen race can build', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.ORC)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const buttons = within(buildBar).getAllByRole('button');

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      getBuildableTowersByFaction(RaceId.ORC).map((tower) => expect.stringContaining(tower.name)),
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('swaps the bar when another race is building', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.ELF)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    expect(within(buildBar).getByRole('button', { name: /Moonwell/ })).toBeDefined();
    expect(within(buildBar).queryByRole('button', { name: /Plague Tower/ })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('marks the tower buttons build-phase-only during a wave', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000, phase: 'wave', canStartWave: false }));
    const selectTower = vi.fn();
    const unsubscribe = onGameCommand('select-tower', selectTower);

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const buttons = within(buildBar).getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('title')).toBe(BUILD_PHASE_ONLY_HINT);
      expect(button.classList.contains(styles.towerBtnLocked)).toBe(true);
    }
    expect(screen.getByRole('note').textContent).toBe(BUILD_PHASE_ONLY_HINT);

    fireEvent.click(buttons[0]);
    expect(selectTower).not.toHaveBeenCalled();
    unsubscribe();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the tower buttons live in the build phase', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000, phase: 'build' }));
    const selectTower = vi.fn();
    const unsubscribe = onGameCommand('select-tower', selectTower);

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const [firstButton] = within(buildBar).getAllByRole('button');
    expect(firstButton.getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
    // The card may wrap or clamp the name; the full name stays in the tooltip.
    expect(firstButton.getAttribute('title')).toBe('Bone Archer Tower');

    fireEvent.click(firstButton);
    expect(selectTower).toHaveBeenCalledOnce();
    unsubscribe();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('exposes the picked tower as a pressed toggle, not only a CSS class', () => {
    const [pickedTower] = getBuildableTowersByFaction(RaceId.UNDEAD);
    publishGameHudSnapshot(
      createSnapshot({ gold: 1000, selectedTowerType: pickedTower.towerType }),
    );

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const buttons = within(buildBar).getAllByRole('button');
    const pressed = buttons.filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.length).toBeGreaterThan(0);
    expect(pressed[0].getAttribute('aria-label')).toContain(pickedTower.name);
    for (const button of buttons) {
      expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'));
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('names the difficulty the way the race and enemy are named', () => {
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    // Display name ("Normal"), never the raw config id ("normal").
    expect(screen.getByText('Normal')).toBeDefined();
    expect(screen.queryByText(Difficulty.NORMAL)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables a tower the player cannot afford', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 0 }));

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    for (const button of within(buildBar).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled, button.getAttribute('aria-label') ?? '').toBe(
        true,
      );
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the cost on every button and keeps the effect hint as a tooltip', () => {
    publishGameHudSnapshot(createSnapshot({ gold: 1000 }));

    render(<HudPanel setup={createSetup(RaceId.UNDEAD)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });

    // The card shows only the price (as in the mockup); the effect lives in the title.
    expect(within(buildBar).getByText('70')).toBeDefined();
    expect(within(buildBar).getByTitle(/Slows/)).toBeDefined();
    expect(within(buildBar).getByTitle(/Boosts towers/)).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('HudPanel viewport layout', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let injectedStyles: { remove: () => void } | null = null;

  afterEach(() => {
    cleanup();
    injectedStyles?.remove();
    injectedStyles = null;
    consoleError.mockClear();
  });

  it('caps the HUD at its viewport share and scrolls the expanded body, not the page', () => {
    injectedStyles = injectCssModule(hudPanelCss, styles);
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);
    const hudRoot = screen.getByRole('region', { name: 'Game HUD' });
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    // The root is capped by a viewport-relative token and may shrink inside
    // the controls strip, but it must not clip (the expand tab hangs above it).
    const rootStyle = getComputedStyle(hudRoot);
    expect(rootStyle.maxHeight).toBe('var(--hud-panel-max-height)');
    expect(rootStyle.minHeight).toBe('0px');
    expect(rootStyle.overflowY).not.toBe('auto');

    const expandedBody = screen.getByText('Enemy gold:').closest(`.${styles.expandedContent}`);
    expect(expandedBody).not.toBeNull();
    const bodyStyle = getComputedStyle(expandedBody as HTMLElement);
    expect(bodyStyle.overflowY).toBe('auto');
    expect(bodyStyle.minHeight).toBe('var(--hud-status-min-height)');
    // The tower cards sit above the scrolling body, so they never scroll away.
    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    expect(expandedBody?.contains(buildBar)).toBe(false);
    expect(expandedBody?.contains(screen.getByText('Enemy gold:'))).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reports expand toggles to the page when controlled', () => {
    publishGameHudSnapshot(createSnapshot());
    const onToggleExpanded = vi.fn();

    const { rerender } = render(
      <HudPanel setup={null} isExpanded={false} onToggleExpanded={onToggleExpanded} />,
    );
    expect(screen.queryByRole('group', { name: 'Buildable towers' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));
    expect(onToggleExpanded).toHaveBeenCalledWith(true);
    // Controlled: the page owns the state, so nothing opens until it re-renders.
    expect(screen.queryByRole('group', { name: 'Buildable towers' })).toBeNull();

    rerender(<HudPanel setup={null} isExpanded onToggleExpanded={onToggleExpanded} />);
    expect(screen.getByRole('group', { name: 'Buildable towers' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse HUD' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('lays the tower cards out as a wrapping grid instead of a sideways scroller', () => {
    injectedStyles = injectCssModule(hudPanelCss, styles);
    publishGameHudSnapshot(createSnapshot());

    render(<HudPanel setup={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand HUD' }));

    const buildBar = screen.getByRole('group', { name: 'Buildable towers' });
    const barStyle = getComputedStyle(buildBar);
    expect(barStyle.display).toBe('grid');
    expect(barStyle.overflowX).not.toBe('auto');
    // Four cards of at least 68px fit the 308px inner width of a 360px phone.
    expect(barStyle.gridTemplateColumns).toContain('minmax(68px, 1fr)');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('HudPanel touch targets', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let injectedStyles: { remove: () => void } | null = null;

  afterEach(() => {
    cleanup();
    injectedStyles?.remove();
    injectedStyles = null;
    consoleError.mockClear();
  });

  function describeControl(element: HTMLElement): string {
    return element.getAttribute('aria-label') ?? element.textContent ?? '';
  }

  /** Height comes from the shared token; width is the token or a wider literal. */
  function expectTouchTarget(element: HTMLElement, { checkWidth }: { checkWidth: boolean }): void {
    const style = getComputedStyle(element);
    expect(style.minHeight, describeControl(element)).toBe('var(--touch-target-min)');
    if (!checkWidth) {
      return;
    }
    const minWidth = style.minWidth;
    const isTokenWidth = minWidth === 'var(--touch-target-min)';
    expect(
      isTokenWidth || Number.parseInt(minWidth, 10) >= 44,
      `min-width ${minWidth} for ${describeControl(element)}`,
    ).toBe(true);
  }

  it('sizes the expand tab and Start Wave to the shared touch target token', () => {
    injectedStyles = injectCssModule(hudPanelCss, styles);
    publishGameHudSnapshot(createSnapshot({ autoStartSecondsLeft: 12 }));

    render(<HudPanel setup={null} />);

    expectTouchTarget(screen.getByRole('button', { name: 'Expand HUD' }), { checkWidth: true });
    // The label (wider than a target) sets the width; it must stay on one line.
    const startWave = screen.getByRole('button', { name: 'Start Wave' });
    expectTouchTarget(startWave, { checkWidth: false });
    expect(getComputedStyle(startWave).whiteSpace).toBe('nowrap');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('sizes the battlefield view toggle to the shared touch target token', () => {
    injectedStyles = injectCssModule(hudPanelCss, styles);
    publishGameHudSnapshot(createSnapshot({ phase: 'wave', canStartWave: false }));

    render(<HudPanel setup={null} />);

    expectTouchTarget(screen.getByRole('button', { name: 'Show opponent battlefield' }), {
      checkWidth: true,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});
