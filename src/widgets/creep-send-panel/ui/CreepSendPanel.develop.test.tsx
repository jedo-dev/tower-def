// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  onGameCommand,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { resolveUnitConfigById } from '../../../entities/unit';
import { Difficulty } from '../../../entities/difficulty';
import { RaceId } from '../../../shared/types/content-ids';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { CreepDevelopToggle } from './CreepDevelopToggle';
import { CreepSendPanel } from './CreepSendPanel';
import { toTalentIconSource } from '../../../shared/ui/branch-glyph';

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.UNDEAD,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};
const SKELETON = resolveUnitConfigById('undead_skeleton');
const GHOUL = resolveUnitConfigById('undead_ghoul');
const FIEND = resolveUnitConfigById('undead_crypt_fiend');
const GARGOYLE = resolveUnitConfigById('undead_gargoyle');
const [GHOUL_A, GHOUL_B] = GHOUL.talentBranches;
const SKELETON_B = SKELETON.talentBranches[1];
const GARGOYLE_A = GARGOYLE.talentBranches[0];
const TOGGLE_LABEL = /^Develop creatures/;

/** Tier 1: 25 XP, tier 2: 3 XP (short of the fiend's 12), tier 3: 12 XP. */
function hud(overrides: Partial<GameHudSnapshot> = {}): GameHudSnapshot {
  return {
    gold: 1000,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 2,
    phase: 'build',
    canStartWave: true,
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
    creatureXpByTier: { 1: 25, 2: 3, 3: 12 },
    creatureBranchChoices: { [SKELETON.id]: SKELETON_B.id, [GARGOYLE.id]: GARGOYLE_A.id },
    creatureGrades: { [SKELETON.id]: 2, [GARGOYLE.id]: 4 },
    ...overrides,
  };
}

/** The SEND tab as the dock wires it: the rail's toggle drives the panel. */
function SendTab() {
  const [isDevelopMode, setIsDevelopMode] = useState(false);
  return (
    <>
      <CreepDevelopToggle
        setup={SETUP}
        isDevelopMode={isDevelopMode}
        onDevelopModeChange={setIsDevelopMode}
      />
      <CreepSendPanel
        setup={SETUP}
        isDevelopMode={isDevelopMode}
        onDevelopModeChange={setIsDevelopMode}
      />
    </>
  );
}

function show(snapshot: GameHudSnapshot = hud()): void {
  publishGameHudSnapshot(snapshot);
  render(<SendTab />);
}

function enterDevelopMode(): HTMLElement {
  const toggle = screen.getByRole('button', { name: TOGGLE_LABEL });
  fireEvent.click(toggle);
  return toggle;
}

function describedReason(element: HTMLElement): string | null | undefined {
  const reasonId = element.getAttribute('aria-describedby');
  return reasonId === null ? null : document.getElementById(reasonId)?.textContent;
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('CreepSendPanel talents in send mode', () => {
  it('marks a developed chip with its branch glyph, grade badge and XP bar', () => {
    show();

    const skeleton = screen.getByRole('button', { name: /^Send Skeleton/ });
    expect(
      within(skeleton).getByTestId('branch-glyph').querySelector('img')?.getAttribute('src'),
    ).toBe(toTalentIconSource(SKELETON_B.id));
    expect(skeleton.querySelector('[data-creature-grade]')?.textContent).toBe('G2/4');
    expect(skeleton.querySelector('[data-creature-xp]')).not.toBeNull();
    expect(skeleton.getAttribute('aria-label')).toContain(
      `Grade 2 of 4, ${SKELETON_B.name}. 25 of 10 XP`,
    );
    expect(skeleton.getAttribute('title')).toContain(SKELETON_B.name);

    const ghoul = screen.getByRole('button', { name: /^Send Ghoul/ });
    expect(within(ghoul).queryByTestId('branch-glyph')).toBeNull();
    expect(ghoul.querySelector('[data-creature-grade]')).toBeNull();
    expect(ghoul.getAttribute('aria-label')).toContain('No branch. 25 of 6 XP');
  });

  it('still sends on the main tap', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('send-creep', handler);
    show();

    fireEvent.click(screen.getByRole('button', { name: /^Send Ghoul/ }));

    expect(handler).toHaveBeenCalledWith({ creepTypeId: GHOUL.id });
    unsubscribe();
  });

  it('flags the Develop toggle when something is affordable', () => {
    show();
    const toggle = screen.getByRole('button', { name: TOGGLE_LABEL });
    expect(toggle.getAttribute('aria-label')).toBe('Develop creatures, upgrades available');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('data-sound')).toBe('ui.open');
    cleanup();

    show(hud({ creatureXpByTier: {} }));
    expect(screen.getByRole('button', { name: TOGGLE_LABEL }).getAttribute('aria-label')).toBe(
      'Develop creatures',
    );
  });
});

describe('CreepSendPanel develop mode', () => {
  it('turns the cards into develop actions and lists XP per tier', () => {
    show();
    const toggle = enterDevelopMode();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('data-sound')).toBe('ui.close');
    expect(screen.queryByRole('button', { name: /^Send / })).toBeNull();
    expect(screen.queryByText('No sends queued')).toBeNull();
    const tiers = screen.getByRole('list', { name: 'Creature experience by tier' });
    expect(
      within(tiers)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['T1 25 XP', 'T2 3 XP', 'T3 12 XP']);
  });

  it('offers Develop for XP on a creature without a branch', () => {
    show();
    enterDevelopMode();

    const develop = screen.getByRole('button', { name: /^Develop Ghoul/ });
    expect(develop.getAttribute('aria-label')).toBe('Develop Ghoul: choose a branch for 6 XP');
    expect(develop.textContent).toContain('6 XP');
    expect(develop.getAttribute('aria-disabled')).toBeNull();
    expect(develop.getAttribute('aria-haspopup')).toBe('dialog');
    expect(develop.getAttribute('data-sound')).toBe('ui.open');
  });

  it('blocks Develop with a reason when the tier lacks XP', () => {
    show();
    enterDevelopMode();

    const develop = screen.getByRole('button', { name: /^Develop Crypt Fiend/ });
    expect(develop.getAttribute('aria-disabled')).toBe('true');
    expect(develop.getAttribute('data-sound')).toBe('ui.error');
    expect(describedReason(develop)).toBe(`Needs ${FIEND.tier * 6} XP`);

    fireEvent.click(develop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('upgrades a creature with a branch for XP', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('upgrade-creature', handler);
    show();
    enterDevelopMode();

    const upgrade = screen.getByRole('button', { name: 'Upgrade Skeleton to grade 3 for 10 XP' });
    expect(upgrade.getAttribute('data-sound')).toBe('ui.success');
    expect(
      within(upgrade).getByTestId('branch-glyph').querySelector('img')?.getAttribute('src'),
    ).toBe(toTalentIconSource(SKELETON_B.id));
    fireEvent.click(upgrade);

    expect(handler).toHaveBeenCalledWith({ unitId: SKELETON.id });
    unsubscribe();
  });

  it('blocks the upgrade with a reason when XP is short', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('upgrade-creature', handler);
    show(hud({ creatureXpByTier: { 1: 9 } }));
    enterDevelopMode();

    const upgrade = screen.getByRole('button', { name: /^Upgrade Skeleton/ });
    expect(upgrade.getAttribute('aria-disabled')).toBe('true');
    expect(describedReason(upgrade)).toBe('Needs 10 XP');
    fireEvent.click(upgrade);
    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('shows the top grade as maxed', () => {
    show();
    enterDevelopMode();

    const gargoyle = screen.getByRole('button', { name: 'Upgrade Gargoyle: max grade' });
    expect(gargoyle.getAttribute('aria-disabled')).toBe('true');
    expect(describedReason(gargoyle)).toBe('Max grade');
    expect(gargoyle.querySelector('[data-creature-grade]')?.textContent).toBe('G4/4');
  });

  it('does not send while developing and goes back to sending', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('send-creep', handler);
    show();
    const toggle = enterDevelopMode();

    fireEvent.click(screen.getByRole('button', { name: /^Upgrade Skeleton/ }));
    expect(handler).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /^Send Skeleton/ })).toBeDefined();
    unsubscribe();
  });
});

describe('CreepSendPanel creature branch chooser', () => {
  function openGhoulChooser(): HTMLElement {
    fireEvent.click(screen.getByRole('button', { name: /^Develop Ghoul/ }));
    return screen.getByRole('dialog', { name: 'Develop Ghoul' });
  }

  it('renders both branches with their grade 1-4 tables, price and lock warning', () => {
    show();
    enterDevelopMode();
    const dialog = openGhoulChooser();

    for (const branch of [GHOUL_A, GHOUL_B]) {
      const card = within(dialog).getByRole('article', { name: branch.name });
      expect(within(card).getByText(branch.description)).toBeDefined();
      const table = within(card).getByRole('table', { name: `${branch.name} grades 1 to 4` });
      const gradeHeaders = within(table).getAllByRole('columnheader');
      expect(gradeHeaders.map((cell) => cell.textContent)).toEqual(['Grade', '1', '2', '3', '4']);
      expect(
        within(card).getByRole('button', { name: `Choose ${branch.name} for 6 XP` }),
      ).toBeDefined();
    }
    expect(
      within(dialog).getByText('Locks the other branch for all Ghouls this match'),
    ).toBeDefined();
  });

  it('sends choose-creature-branch for the confirmed branch and closes', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('choose-creature-branch', handler);
    show();
    enterDevelopMode();
    const dialog = openGhoulChooser();

    const confirm = within(dialog).getByRole('button', { name: 'Confirm branch' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      within(dialog).getByRole('button', { name: `Choose ${GHOUL_B.name} for 6 XP` }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: `Confirm ${GHOUL_B.name} for 6 XP` }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ unitId: GHOUL.id, branchId: GHOUL_B.id });
    expect(screen.queryByRole('dialog')).toBeNull();
    unsubscribe();
  });

  it('shows the upgrade on the card once the engine reports the branch', () => {
    show();
    enterDevelopMode();
    act(() => {
      publishGameHudSnapshot(
        hud({
          creatureXpByTier: { 1: 21, 2: 3, 3: 12 },
          creatureBranchChoices: {
            [SKELETON.id]: SKELETON_B.id,
            [GARGOYLE.id]: GARGOYLE_A.id,
            [GHOUL.id]: GHOUL_A.id,
          },
        }),
      );
    });

    const ghoul = screen.getByRole('button', { name: 'Upgrade Ghoul to grade 1 for 2 XP' });
    expect(ghoul.querySelector('[data-creature-grade]')?.textContent).toBe('G0/4');
    expect(
      within(ghoul).getByTestId('branch-glyph').querySelector('img')?.getAttribute('src'),
    ).toBe(toTalentIconSource(GHOUL_A.id));
  });

  it('is driven by the keyboard end to end', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('choose-creature-branch', handler);
    show();
    const toggle = screen.getByRole('button', { name: TOGGLE_LABEL });
    toggle.focus();
    // Enter or Space on a focused native button activates it.
    fireEvent.click(document.activeElement!);
    const develop = screen.getByRole('button', { name: /^Develop Ghoul/ });
    develop.focus();
    fireEvent.click(document.activeElement!);
    const dialog = screen.getByRole('dialog', { name: 'Develop Ghoul' });

    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handler).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(develop);
    // The chooser's Escape stays inside it; a second one leaves develop mode.
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    fireEvent.keyDown(develop, { key: 'Escape' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: /^Send Ghoul/ })).toBeDefined();
    unsubscribe();
  });
});
