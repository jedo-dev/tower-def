// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BestiaryPage } from './BestiaryPage';
import { buildBestiaryViewModel } from '../model/buildBestiaryViewModel';
import { getTierEconomy } from '../model/tierEconomy';
import { RaceId } from '../../../shared/types/content-ids';
import { getAllRaceRegistries } from '../../../entities/race-registry';
import { getUnitsByFaction, resolveUnitConfigById, type UnitConfig } from '../../../entities/unit';
import { getBuildableTowersByFaction, resolveBuildableTowerById } from '../../../entities/tower';
import { toTowerIconSource } from '../../../shared/ui/tower-icon';

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function openTile(name: string): ReturnType<typeof within> {
  fireEvent.click(screen.getByRole('button', { name }));
  return within(screen.getByRole('dialog', { name }));
}

describe('BestiaryPage overview', () => {
  it('renders a tab for every race and the first race open, without React warnings', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Undead', 'Orc', 'Human', 'Elf']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('switches races and shows a tile for every tower and creature of the content', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);

    for (const race of getAllRaceRegistries()) {
      fireEvent.click(screen.getByRole('tab', { name: race.name }));
      const panel = screen.getByRole('tabpanel');

      expect(panel.id).toContain(race.raceId.toLowerCase());
      expect(panel.querySelectorAll('[data-creep-card]')).toHaveLength(
        getUnitsByFaction(race.raceId).length,
      );
      expect(panel.querySelectorAll('[data-tower-card]')).toHaveLength(
        getBuildableTowersByFaction(race.raceId).length,
      );
      expect(
        Array.from(panel.querySelectorAll('[data-tower-card] img'), (image) =>
          image.getAttribute('src'),
        ),
      ).toEqual(
        getBuildableTowersByFaction(race.raceId).map((tower) => toTowerIconSource(tower.id)),
      );
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the tier badge and key stats on a creature tile', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const tile = screen.getByRole('button', { name: skeleton.name });

    expect(tile.textContent).toContain(`T${skeleton.tier}`);
    expect(tile.textContent).toContain('Ground · Small');
    const description = document.getElementById(tile.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe(
      `Ground · Small. HP (wave 1): ${skeleton.health}, Speed: ${skeleton.speed}, ` +
        `Send cost, gold: ${getTierEconomy(skeleton.tier).sendCost}`,
    );
  });

  it('walks the race tabs with the keyboard', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const undeadTab = screen.getByRole('tab', { name: 'Undead' });
    const orcTab = screen.getByRole('tab', { name: 'Orc' });
    const elfTab = screen.getByRole('tab', { name: 'Elf' });

    expect(orcTab.tabIndex).toBe(-1);
    fireEvent.keyDown(undeadTab, { key: 'ArrowRight' });
    expect(orcTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(orcTab);
    expect(screen.getByRole('tabpanel').id).toBe(orcTab.getAttribute('aria-controls'));

    fireEvent.keyDown(orcTab, { key: 'ArrowLeft' });
    expect(undeadTab.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(undeadTab, { key: 'End' });
    expect(elfTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').id).toContain(RaceId.ELF.toLowerCase());
  });

  it('goes back to the start menu', () => {
    const onNavigate = vi.fn();
    render(<BestiaryPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(onNavigate).toHaveBeenCalledWith('start');
  });
});

describe('BestiaryPage detail', () => {
  it('opens a tower with its base stats, specials and three level columns', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const nest = resolveBuildableTowerById('undead_frost_wyrm_nest');

    const detail = openTile(nest.name);

    expect(detail.getByRole('heading', { level: 2 }).textContent).toBe(nest.name);
    expect(detail.getByText('Undead · Tower')).toBeDefined();
    expect(
      screen
        .getByRole('dialog', { name: nest.name })
        .querySelector(`img[src="${toTowerIconSource(nest.id)}"]`),
    ).not.toBeNull();
    const base = within(detail.getByRole('list', { name: 'Base stats' }));
    expect(base.getByTitle('Build cost, gold').textContent).toBe(
      `Build cost, gold: ${nest.costGold}`,
    );
    expect(base.getByTitle('Range, cells').textContent).toBe(`Range, cells: ${nest.range}`);
    expect(
      within(detail.getByRole('list', { name: 'Specials' })).getByText(
        'Chill: 35% slower for 2.0s',
      ),
    ).toBeDefined();
    const levels = within(detail.getByRole('list', { name: 'Upgrade levels' }));
    expect(
      levels.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent),
    ).toEqual(['L1', 'L2', 'L3']);
    expect(document.activeElement).toBe(detail.getByRole('button', { name: 'Back to Bestiary' }));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows one talent branch at a time and switches with the toggle', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const nest = resolveBuildableTowerById('undead_frost_wyrm_nest');
    const [first, second] = nest.talentBranches;
    const detail = openTile(nest.name);
    const toggle = within(detail.getByRole('group', { name: 'Talent branch' }));
    const [firstButton, secondButton] = toggle.getAllByRole('button');

    expect(firstButton.getAttribute('aria-pressed')).toBe('true');
    expect(secondButton.getAttribute('aria-pressed')).toBe('false');
    expect(detail.getByText(first.description)).toBeDefined();
    expect(detail.queryByText(second.description)).toBeNull();
    expect(firstButton.querySelector('img')?.getAttribute('src')).toContain(first.id);
    expect(detail.getByRole('heading', { level: 4, name: `G4 · ${first.name}` })).toBeDefined();
    expect(detail.getByText('chill 60% slower for 2.5s')).toBeDefined();

    fireEvent.click(secondButton);

    expect(secondButton.getAttribute('aria-pressed')).toBe('true');
    expect(detail.getByText(second.description)).toBeDefined();
    expect(detail.queryByText(first.description)).toBeNull();
    expect(detail.getByRole('heading', { level: 4, name: `G4 · ${second.name}` })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('steps through the grades of a branch with stats against the grade before', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const archer = resolveBuildableTowerById('undead_bone_archer_tower');
    const grades = archer.talentBranches[0].grades;
    const detail = openTile(archer.name);
    const stepper = within(
      detail.getByRole('group', { name: `${archer.talentBranches[0].name} grade` }),
    );

    expect(detail.getByText('change vs L3')).toBeDefined();
    fireEvent.click(
      stepper.getByRole('button', { name: `Grade 7, ${grades[3].upgradeCostGold} gold` }),
    );

    const stats = within(detail.getByRole('list', { name: 'Grade 7 stats' }));
    expect(stats.getByTitle('Physical damage').textContent).toBe(
      `Physical damage: ${grades[3].stats.damage}+${grades[3].stats.damage - grades[2].stats.damage}`,
    );
    expect(detail.getByText('change vs G6')).toBeDefined();
  });

  it('opens a creature with its economy, abilities and talent grades 1-4', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const gargoyle = resolveUnitConfigById('undead_gargoyle');
    const economy = getTierEconomy(gargoyle.tier);
    const detail = openTile(gargoyle.name);

    expect(detail.getByText('Undead · Creature')).toBeDefined();
    expect(detail.getByText(`Wave ${economy.unlockWave}+`)).toBeDefined();
    const economyRow = within(detail.getByLabelText('Economy'));
    expect(economyRow.getByText('Send').nextElementSibling?.textContent).toBe(
      String(economy.sendCost),
    );
    expect(economyRow.getByText('Cap').nextElementSibling?.textContent).toBe(
      `${economy.perWaveCap}/wave`,
    );

    fireEvent.click(detail.getByRole('button', { name: /Dive/ }));
    const stepper = within(detail.getByRole('group', { name: 'Dive grade' }));
    expect(stepper.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'G1',
      'G2',
      'G3',
      'G4',
    ]);
    fireEvent.click(stepper.getByRole('button', { name: 'Grade 4' }));
    expect(
      detail.getByText(/last 50% of the route speed x1\.75; a leak takes 2 lives/),
    ).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('keeps the lore folded until asked', () => {
    const [undead] = getAllRaceRegistries();
    const ghoul = resolveUnitConfigById('undead_ghoul');
    const viewModel = buildBestiaryViewModel({
      races: [undead],
      unitsOf: () => [{ ...ghoul, lore: 'It never stops hungering.' } as UnitConfig],
      towersOf: () => [],
    });
    render(<BestiaryPage onNavigate={() => undefined} viewModel={viewModel} />);
    const detail = openTile(ghoul.name);
    const fold = detail.getByRole('button', { name: /Lore/ });

    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(detail.queryByText('It never stops hungering.')).toBeNull();
    fireEvent.click(fold);
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    expect(detail.getByText('It never stops hungering.')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('walks to the previous and next entry of the roster, wrapping at the ends', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const towers = getBuildableTowersByFaction(RaceId.UNDEAD);
    const detail = openTile(towers[0].name);
    const last = towers[towers.length - 1];

    expect(detail.getByText(`1 / ${towers.length}`)).toBeDefined();
    fireEvent.click(detail.getByRole('button', { name: `Previous tower: ${last.name}` }));
    expect(screen.getByRole('dialog', { name: last.name })).toBeDefined();
    expect(detail.getByText(`${towers.length} / ${towers.length}`)).toBeDefined();

    fireEvent.click(detail.getByRole('button', { name: `Next tower: ${towers[0].name}` }));
    expect(screen.getByRole('dialog', { name: towers[0].name })).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('closes on Escape and hands focus back to the tile of the entry last shown', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const towers = getBuildableTowersByFaction(RaceId.UNDEAD);
    const detail = openTile(towers[0].name);
    fireEvent.click(detail.getByRole('button', { name: `Next tower: ${towers[1].name}` }));

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: towers[1].name }));
  });

  it('closes with the back arrow', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const detail = openTile(skeleton.name);

    fireEvent.click(detail.getByRole('button', { name: 'Back to Bestiary' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
