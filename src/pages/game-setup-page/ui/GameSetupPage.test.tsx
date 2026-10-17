// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { builderFactions } from '../../../entities/builder-faction';
import { DEFAULT_DIFFICULTY, difficulties } from '../../../entities/difficulty';
import { DEFAULT_ENEMY_FACTION, enemyFactions } from '../../../entities/enemy-faction';
import { DIFFICULTY_GROUP_LABEL } from './DifficultyStep';
import { ENEMY_FACTION_GROUP_LABEL } from './EnemyFactionStep';
import { resetSetupSelectionMemory } from '../model/setupSelectionMemory';
import { GameSetupPage } from './GameSetupPage';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  resetSetupSelectionMemory();
  vi.useRealTimers();
  consoleError.mockClear();
});

function renderPage() {
  const onStartGame = vi.fn();
  const onNavigate = vi.fn();
  render(<GameSetupPage onStartGame={onStartGame} onNavigate={onNavigate} />);
  return { onStartGame, onNavigate };
}

function checkedRadio(group: HTMLElement): HTMLElement {
  const checked = within(group)
    .getAllByRole('radio')
    .filter((radio) => radio.getAttribute('aria-checked') === 'true');
  expect(checked).toHaveLength(1);
  return checked[0];
}

describe('GameSetupPage selection semantics', () => {
  it('exposes the enemy factions as a radio group with one checked option', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    const group = screen.getByRole('radiogroup', { name: ENEMY_FACTION_GROUP_LABEL });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(enemyFactions.length);

    const defaultName = enemyFactions.find((faction) => faction.id === DEFAULT_ENEMY_FACTION)!.name;
    const checked = checkedRadio(group);
    expect(checked.textContent).toContain(defaultName);
    // Roving tabindex: only the checked option is in the tab order.
    expect(radios.filter((radio) => radio.tabIndex === 0)).toEqual([checked]);

    fireEvent.click(radios[(radios.indexOf(checked) + 1) % radios.length]);
    expect(checkedRadio(group)).toBe(radios[(radios.indexOf(checked) + 1) % radios.length]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows each race emblem on the carousel and the enemy cards', () => {
    renderPage();
    const firstRace = builderFactions[0];

    expect(document.querySelector('.setup-race-emblem')?.getAttribute('src')).toBe(
      `/assets/ui/factions/${firstRace.id.toLowerCase()}.webp`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    const group = screen.getByRole('radiogroup', { name: ENEMY_FACTION_GROUP_LABEL });
    const sources = within(group)
      .getAllByRole('radio')
      .map((radio) => radio.querySelector('img')?.getAttribute('src'));
    expect(sources).toEqual(
      enemyFactions.map((faction) => `/assets/ui/factions/${faction.id.toLowerCase()}.webp`),
    );
    // The card's own name labels it; the emblem stays silent.
    expect(within(group).queryAllByRole('img')).toHaveLength(0);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('moves the enemy selection and focus with the arrow keys', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    const group = screen.getByRole('radiogroup', { name: ENEMY_FACTION_GROUP_LABEL });
    const radios = within(group).getAllByRole('radio');
    const startIndex = radios.indexOf(checkedRadio(group));

    fireEvent.keyDown(radios[startIndex], { key: 'ArrowRight' });
    const nextIndex = (startIndex + 1) % radios.length;
    expect(checkedRadio(group)).toBe(radios[nextIndex]);
    expect(document.activeElement).toBe(radios[nextIndex]);

    fireEvent.keyDown(radios[nextIndex], { key: 'Home' });
    expect(checkedRadio(group)).toBe(radios[0]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('exposes the difficulties as a radio group', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const group = screen.getByRole('radiogroup', { name: DIFFICULTY_GROUP_LABEL });
    expect(within(group).getAllByRole('radio')).toHaveLength(difficulties.length);
    const defaultName = difficulties.find((entry) => entry.id === DEFAULT_DIFFICULTY)!.name;
    expect(checkedRadio(group).textContent).toContain(defaultName);

    fireEvent.keyDown(checkedRadio(group), { key: 'End' });
    expect(checkedRadio(group).textContent).toContain(difficulties[difficulties.length - 1].name);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('GameSetupPage wizard consistency', () => {
  it('counts the race carousel as "n / total" and keeps the dashes as step progress', () => {
    vi.useFakeTimers();
    renderPage();

    expect(screen.getByText(`1 / ${builderFactions.length}`)).toBeDefined();
    expect(screen.getByRole('img', { name: 'Step 1 of 4' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(`2 / ${builderFactions.length}`)).toBeDefined();
    const progress = screen.getByRole('img', { name: 'Step 1 of 4' });
    const activeDashes = progress.querySelectorAll('.setup-progress-dot-active');
    expect(activeDashes).toHaveLength(1);
    expect(activeDashes[0].getAttribute('data-step')).toBe('builder-race');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('remembers race, enemy and difficulty when the wizard is opened again', () => {
    vi.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
    act(() => {
      vi.runAllTimers();
    });
    const pickedRace = builderFactions[1].name;
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    const enemyGroup = screen.getByRole('radiogroup', { name: ENEMY_FACTION_GROUP_LABEL });
    const pickedEnemy = within(enemyGroup).getAllByRole('radio')[enemyFactions.length - 1];
    fireEvent.click(pickedEnemy);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const difficultyGroup = screen.getByRole('radiogroup', { name: DIFFICULTY_GROUP_LABEL });
    fireEvent.click(within(difficultyGroup).getAllByRole('radio')[difficulties.length - 1]);

    cleanup();
    renderPage();

    expect(screen.getByRole('heading', { name: pickedRace })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(
      checkedRadio(screen.getByRole('radiogroup', { name: ENEMY_FACTION_GROUP_LABEL })).textContent,
    ).toContain(enemyFactions[enemyFactions.length - 1].name);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      checkedRadio(screen.getByRole('radiogroup', { name: DIFFICULTY_GROUP_LABEL })).textContent,
    ).toContain(difficulties[difficulties.length - 1].name);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps dynamic entrances a labelled switch on the summary', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const toggle = screen.getByRole('switch', {
      name: 'Randomize entrance and exit positions on map edges',
    });
    expect((toggle as HTMLInputElement).checked).toBe(false);
    fireEvent.click(toggle);
    expect(screen.getByText('Random edges')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('GameSetupPage action colours', () => {
  it('confirms steps with the mossy green button and starts with the crimson one', () => {
    renderPage();
    const choose = screen.getByRole('button', { name: 'Choose' });
    expect(choose.className).toBe('setup-next-button');
    fireEvent.click(choose);
    expect(screen.getByRole('button', { name: 'Continue' }).className).toBe('setup-next-button');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('button', { name: 'Start Game' }).className).toContain(
      'setup-next-button--primary',
    );
    expect(consoleError).not.toHaveBeenCalled();
  });
});
