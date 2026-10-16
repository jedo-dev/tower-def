// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { publishGameEvent, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot, SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { getTowerStatsForCurveLevel, getTowerStatsForLevel } from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { TowerActionPanel } from './TowerActionPanel';
import { NEXT_LEVEL_PREVIEW_LABEL } from './NextLevelPreview';

function createHudSnapshot(): GameHudSnapshot {
  return {
    gold: 1000,
    income: 40,
    lives: 20,
    opponentGold: 400,
    opponentIncome: 40,
    opponentLives: 20,
    matchOutcome: { status: 'active', winner: null, reason: null },
    builderFactionName: 'Undead',
    waveNumber: 3,
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
  };
}

function selectTower(type: TowerTypeId, level = 1): SelectedTowerSnapshot {
  const stats = getTowerStatsForLevel(type, level)!;

  return {
    id: `tower:${type}`,
    type,
    level,
    position: { x: 4, y: 4 },
    cost: 60,
    combatStats: { ...stats },
    availableBranches: [],
    chosenBranchId: null,
  };
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  publishGameEvent('selected-tower', { tower: null });
  consoleError.mockClear();
});

describe('TowerActionPanel effects', () => {
  it('lists what a frost tower does beyond damage', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.FROST) });
    });

    const effects = screen.getByRole('list', { name: 'Tower effects' });

    expect(within(effects).getByText('SLOW')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows no effect list for a plain single target tower', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SINGLE) });
    });

    expect(screen.queryByRole('list', { name: 'Tower effects' })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('drops the upgrade preview at max level', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.POISON, 3) });
    });

    expect(screen.queryByRole('group', { name: /^Next level/ })).toBeNull();
    expect(screen.getByText('MAX LEVEL')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('TowerActionPanel stats', () => {
  it('pairs each stat value with its full name in a description list', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SPLASH) });
    });

    const stats = screen.getByRole('region', { name: 'Tower actions' });
    const terms = within(stats).getAllByRole('term');
    const definitions = within(stats).getAllByRole('definition');
    const expected = getTowerStatsForLevel(TowerTypeId.SPLASH, 1)!;

    expect(terms.map((term) => term.textContent)).toEqual([
      'DMGDamage',
      'RNGRange',
      'SPDAttack cooldown',
      'AOESplash radius',
    ]);
    expect(definitions[0].textContent).toBe(String(expected.damage));
    expect(terms[0].querySelector('[aria-hidden="true"]')?.textContent).toBe('DMG');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('TowerActionPanel next level preview', () => {
  function renderPreview(type: TowerTypeId, level = 1): HTMLElement {
    publishGameHudSnapshot(createHudSnapshot());
    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(type, level) });
    });
    return screen.getByRole('group', { name: `${NEXT_LEVEL_PREVIEW_LABEL} ${level + 1}` });
  }

  function itemTexts(preview: HTMLElement): string[] {
    return within(preview)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
  }

  it('shows the damage, range and cooldown deltas of a single target tower', () => {
    const preview = renderPreview(TowerTypeId.SINGLE);
    const current = getTowerStatsForLevel(TowerTypeId.SINGLE, 1)!;
    const next = getTowerStatsForLevel(TowerTypeId.SINGLE, 2)!;

    expect(preview.textContent).toContain('NEXT:');
    expect(itemTexts(preview)).toEqual([
      `DMGDamage ${next.damage} (+${next.damage - current.damage})`,
      `RNGRange ${next.range.toFixed(1)} (+${(next.range - current.range).toFixed(1)})`,
      `SPDAttack cooldown ${next.attackCooldownMs}ms (-${current.attackCooldownMs - next.attackCooldownMs}ms)`,
    ]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reads an authored tower from its own curve, the one its upgrade follows', () => {
    const authoredId = 'human_guard_archer_tower';
    const current = getTowerStatsForCurveLevel(TowerTypeId.SINGLE, authoredId, 1)!;
    const next = getTowerStatsForCurveLevel(TowerTypeId.SINGLE, authoredId, 2)!;
    // The authored curve differs from the archetype one, so the source matters.
    expect(next.damage).not.toBe(getTowerStatsForLevel(TowerTypeId.SINGLE, 2)!.damage);
    publishGameHudSnapshot(createHudSnapshot());
    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', {
        tower: {
          ...selectTower(TowerTypeId.SINGLE),
          buildableTowerId: authoredId,
          combatStats: { ...current },
        },
      });
    });

    const preview = screen.getByRole('group', { name: `${NEXT_LEVEL_PREVIEW_LABEL} 2` });
    expect(itemTexts(preview)[0]).toBe(
      `DMGDamage ${next.damage} (+${next.damage - current.damage})`,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('adds the stronger poison of the next level', () => {
    const preview = renderPreview(TowerTypeId.POISON);

    expect(itemTexts(preview).some((text) => text.startsWith('POISON'))).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the wider splash once the curve grows it', () => {
    const preview = renderPreview(TowerTypeId.SPLASH, 2);
    const current = getTowerStatsForLevel(TowerTypeId.SPLASH, 2)!;
    const next = getTowerStatsForLevel(TowerTypeId.SPLASH, 3)!;
    const growth = (next.splashRadius ?? 0) - (current.splashRadius ?? 0);

    expect(itemTexts(preview)).toContain(
      `AOESplash radius ${next.splashRadius?.toFixed(1)} (+${growth.toFixed(1)})`,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the damage of each chain jump at the next level', () => {
    const preview = renderPreview(TowerTypeId.CHAIN);

    expect(itemTexts(preview).find((text) => text.startsWith('CHAIN'))).toMatch(
      /^CHAIN jumps \d+(\/\d+)*$/,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the bigger aura of a support tower, which has no attack stats to grow', () => {
    const preview = renderPreview(TowerTypeId.SUPPORT);
    const nextAura = getTowerStatsForLevel(TowerTypeId.SUPPORT, 2)!.aura!;

    expect(itemTexts(preview)).toEqual([
      `AURA +${Math.round(nextAura.attackSpeedBonus * 100)}% speed, +${nextAura.rangeBonus.toFixed(1)} range, ${nextAura.radiusCells} cells`,
    ]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
