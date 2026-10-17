// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  onGameCommand,
  publishGameHudSnapshot,
  resetGameBridgeState,
} from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot } from '../../../shared/lib/game-bridge/types';
import { Difficulty } from '../../../entities/difficulty';
import { getRaceRegistry } from '../../../entities/race-registry';
import { resolveUnitConfigById } from '../../../entities/unit';
import { getCreatureSendUnlockWave } from '../../../shared/constants/creatureSendUnlock';
import { RaceId } from '../../../shared/types/content-ids';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { CreepSendPanel } from './CreepSendPanel';
import { resolveCardIndexForKey } from '../model/resolveCardIndexForKey';
import { measureScrollRowEdges } from './useScrollRowEdges';

const SETUP: GameSetupConfig = {
  builderFaction: RaceId.ELF,
  enemyFaction: RaceId.ORC,
  difficulty: Difficulty.NORMAL,
};
const ELF_IDS = getRaceRegistry(RaceId.ELF).sendableCreepIds;
const CARD_WIDTH = 86;
const ROW_WIDTH = 362;

function hud(overrides: Partial<GameHudSnapshot> = {}): GameHudSnapshot {
  return {
    gold: 10_000,
    income: 50,
    lives: 20,
    opponentGold: 500,
    opponentIncome: 50,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Elf',
    waveNumber: 1,
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
    creatureXpByTier: { 5: 60, 6: 60 },
    creatureBranchChoices: {},
    creatureGrades: {},
    ...overrides,
  };
}

function show(
  props: Partial<Parameters<typeof CreepSendPanel>[0]> = {},
  snapshot: GameHudSnapshot = hud(),
): void {
  publishGameHudSnapshot(snapshot);
  render(
    <CreepSendPanel
      setup={SETUP}
      isDevelopMode={false}
      onDevelopModeChange={() => undefined}
      {...props}
    />,
  );
}

function row(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-send-row]');
  if (!element) throw new Error('send row not rendered');
  return element;
}

/** jsdom lays nothing out: give the row the metrics of 8 cards at 390px. */
function layOutRow(element: HTMLElement): void {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: ROW_WIDTH });
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: ELF_IDS.length * (CARD_WIDTH + 6) - 6,
  });
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  resetGameBridgeState();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('CreepSendPanel row of every creature (tower-def-qpb)', () => {
  it('renders all 8 creatures by tier, locked tiers with a badge, name and price', () => {
    show();

    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-send-card]'));
    expect(cards).toHaveLength(8);
    const locked = cards.filter((card) => card.hasAttribute('data-locked'));
    const expectedLocked = ELF_IDS.filter(
      (id) => getCreatureSendUnlockWave(resolveUnitConfigById(id).tier) > 1,
    );
    expect(locked).toHaveLength(expectedLocked.length);
    expect(locked.length).toBeGreaterThan(0);

    const giant = resolveUnitConfigById('elf_mountain_giant');
    const giantCard = screen.getByRole('button', { name: /^Mountain Giant locked/ });
    const unlockWave = getCreatureSendUnlockWave(giant.tier);
    expect(giantCard.getAttribute('aria-disabled')).toBe('true');
    expect(giantCard.getAttribute('aria-label')).toContain(`sendable from wave ${unlockWave}`);
    expect(giantCard.querySelector('[data-send-lock]')?.textContent).toBe(
      `from wave ${unlockWave}`,
    );
    expect(giantCard.textContent).toContain('Mountain Giant');
    expect(giantCard.textContent).toMatch(/\$\d+/);
    expect(screen.getByRole('img', { name: 'Mountain Giant' })).toBeDefined();
  });

  it('never sends a locked creature on tap', () => {
    const handler = vi.fn();
    const unsubscribe = onGameCommand('send-creep', handler);
    show();

    fireEvent.click(screen.getByRole('button', { name: /^Mountain Giant locked/ }));
    expect(handler).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Send Archer/ }));
    expect(handler).toHaveBeenCalledWith({ creepTypeId: 'elf_archer' });
    unsubscribe();
  });

  it('unlocks the top tier from its wave on', () => {
    show({}, hud({ waveNumber: getCreatureSendUnlockWave(6) }));

    expect(document.querySelectorAll('[data-locked]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^Send Mountain Giant/ })).toBeDefined();
  });

  it('develops every creature, tiers 5 and 6 included', () => {
    show({ isDevelopMode: true });

    const developCards = document.querySelectorAll('[data-develop-card]');
    expect(developCards).toHaveLength(8);
    const giant = screen.getByRole('button', { name: /^Develop Mountain Giant/ });
    expect(giant.getAttribute('aria-disabled')).toBeNull();
    expect(screen.getByRole('button', { name: /^Develop Hippogryph/ })).toBeDefined();
  });

  it('fades the edges that hide cards, from the scroll position', () => {
    const onScrollLeftChange = vi.fn();
    show({ onScrollLeftChange });
    const element = row();
    layOutRow(element);

    act(() => {
      element.scrollLeft = 0;
      fireEvent.scroll(element);
    });
    expect(element.hasAttribute('data-fade-start')).toBe(false);
    expect(element.getAttribute('data-fade-end')).toBe('true');

    act(() => {
      element.scrollLeft = 2 * (CARD_WIDTH + 6);
      fireEvent.scroll(element);
    });
    expect(onScrollLeftChange).toHaveBeenLastCalledWith(2 * (CARD_WIDTH + 6));
    expect(element.getAttribute('data-fade-start')).toBe('true');
    expect(element.getAttribute('data-fade-end')).toBe('true');

    act(() => {
      element.scrollLeft = element.scrollWidth - ROW_WIDTH;
      fireEvent.scroll(element);
    });
    expect(element.getAttribute('data-fade-start')).toBe('true');
    expect(element.hasAttribute('data-fade-end')).toBe(false);
  });

  it('restores the scroll position it mounts with', () => {
    show({ initialScrollLeft: 184 });

    expect(row().scrollLeft).toBe(184);
    expect(row().getAttribute('data-fade-start')).toBe('true');
  });

  it('walks the cards with the arrow keys, Home and End', () => {
    show();
    const cards = Array.from(row().querySelectorAll<HTMLElement>(':scope > button'));
    expect(cards).toHaveLength(8);
    cards[0].focus();

    fireEvent.keyDown(cards[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cards[1]);
    fireEvent.keyDown(cards[1], { key: 'End' });
    // The last card is locked at wave 1, and still reachable.
    expect(document.activeElement).toBe(cards[7]);
    fireEvent.keyDown(cards[7], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cards[7]);
    fireEvent.keyDown(cards[7], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cards[6]);
    fireEvent.keyDown(cards[6], { key: 'Home' });
    expect(document.activeElement).toBe(cards[0]);
  });
});

describe('send row helpers', () => {
  it('maps the row keys to a card index, clamped at both ends', () => {
    expect(resolveCardIndexForKey(0, 8, 'ArrowLeft')).toBe(0);
    expect(resolveCardIndexForKey(3, 8, 'ArrowRight')).toBe(4);
    expect(resolveCardIndexForKey(7, 8, 'ArrowRight')).toBe(7);
    expect(resolveCardIndexForKey(4, 8, 'Home')).toBe(0);
    expect(resolveCardIndexForKey(4, 8, 'End')).toBe(7);
    expect(resolveCardIndexForKey(4, 8, 'Enter')).toBeNull();
    expect(resolveCardIndexForKey(0, 0, 'End')).toBeNull();
  });

  it('measures the hidden edges with a pixel of tolerance', () => {
    expect(measureScrollRowEdges(0, 362, 730)).toEqual({
      hasMoreAtStart: false,
      hasMoreAtEnd: true,
    });
    expect(measureScrollRowEdges(367.5, 362, 730)).toEqual({
      hasMoreAtStart: true,
      hasMoreAtEnd: false,
    });
    expect(measureScrollRowEdges(0, 730, 730)).toEqual({
      hasMoreAtStart: false,
      hasMoreAtEnd: false,
    });
  });
});
