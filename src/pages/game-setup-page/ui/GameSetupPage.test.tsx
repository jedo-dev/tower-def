// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DEFAULT_DIFFICULTY, difficulties } from '../../../entities/difficulty';
import { DEFAULT_ENEMY_FACTION, enemyFactions } from '../../../entities/enemy-faction';
import { DIFFICULTY_GROUP_LABEL } from './DifficultyStep';
import { ENEMY_FACTION_GROUP_LABEL } from './EnemyFactionStep';
import { GameSetupPage } from './GameSetupPage';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
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
