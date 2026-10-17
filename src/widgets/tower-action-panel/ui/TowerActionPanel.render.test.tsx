// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { publishGameEvent, publishGameHudSnapshot } from '../../../shared/lib/game-bridge/bridge';
import type { GameHudSnapshot, SelectedTowerSnapshot } from '../../../shared/lib/game-bridge/types';
import { getTowerStatsForCurveLevel, getTowerStatsForLevel } from '../../../entities/tower';
import { TowerTypeId } from '../../../shared/types/content-ids';
import { TowerActionPanel } from './TowerActionPanel';
import { NEXT_LEVEL_PREVIEW_LABEL } from './NextLevelPreview';
import { toTowerIconSource } from '../../../shared/ui/tower-icon';

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
    creatureXpByTier: {},
    creatureBranchChoices: {},
    creatureGrades: {},
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

describe('TowerActionPanel header icon', () => {
  it('shows the painted icon of the selected race tower', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', {
        tower: {
          ...selectTower(TowerTypeId.SPLASH),
          name: 'Tar Pit',
          buildableTowerId: 'orc_tar_pit',
        },
      });
    });

    const icon = screen.getByRole('img', { name: 'Tar Pit' });

    expect(icon.querySelector('img')?.getAttribute('src')).toBe(toTowerIconSource('orc_tar_pit'));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the question chip for an archetype tower with no race id or sheet', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.FROST) });
    });

    expect(screen.getByRole('img', { name: 'Frost Tower: artwork pending' })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('TowerActionPanel stats', () => {
  it('shows each stat as a named tile with its next-level value', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SPLASH) });
    });

    const sheet = screen.getByRole('region', { name: 'Tower actions' });
    const terms = within(sheet).getAllByRole('term');
    const definitions = within(sheet).getAllByRole('definition');
    const current = getTowerStatsForLevel(TowerTypeId.SPLASH, 1)!;
    const next = getTowerStatsForLevel(TowerTypeId.SPLASH, 2)!;

    expect(terms.map((term) => term.textContent)).toEqual([
      'Damage',
      'Range',
      'Cooldown',
      'Splash',
    ]);
    expect(definitions[0].textContent).toBe(`${current.damage}→ next level ${next.damage}`);
    expect(definitions[2].textContent).toContain(
      `${(current.attackCooldownMs / 1000).toFixed(2)}s`,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the plain values and offers no upgrade at max level', () => {
    publishGameHudSnapshot(createHudSnapshot());

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SINGLE, 3) });
    });

    const stats = getTowerStatsForLevel(TowerTypeId.SINGLE, 3)!;
    const definitions = screen.getAllByRole('definition');
    expect(definitions[0].textContent).toBe(String(stats.damage));
    const upgrade = screen.getByRole('button', { name: 'Tower is at max level' });
    expect((upgrade as HTMLButtonElement).disabled).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('disables Upgrade with the reason when the gold is short', () => {
    publishGameHudSnapshot({ ...createHudSnapshot(), gold: 0 });

    render(<TowerActionPanel />);
    act(() => {
      publishGameEvent('selected-tower', { tower: selectTower(TowerTypeId.SINGLE) });
    });

    const upgrade = screen.getByRole('button', { name: 'Upgrade tower to level 2' });
    expect((upgrade as HTMLButtonElement).disabled).toBe(true);
    const reasonId = upgrade.getAttribute('aria-describedby')!;
    expect(document.getElementById(reasonId)?.textContent).toBe('Not enough gold');
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

    expect(preview.textContent).toMatch(/^NEXT Lv 2/);
    expect(itemTexts(preview)).toEqual([
      `+${next.damage - current.damage} damage`,
      `+${(next.range - current.range).toFixed(1)} range`,
      `−${((current.attackCooldownMs - next.attackCooldownMs) / 1000).toFixed(2)}s`,
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
    expect(itemTexts(preview)[0]).toBe(`+${next.damage - current.damage} damage`);
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

    expect(itemTexts(preview)).toContain(`+${growth.toFixed(1)} splash`);
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
