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

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BestiaryPage', () => {
  it('renders a tab for every race and the first race open, without React warnings', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Undead', 'Orc', 'Human', 'Elf']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows every race on its own tab, with creeps and towers from the content', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);

    for (const race of getAllRaceRegistries()) {
      fireEvent.click(screen.getByRole('tab', { name: race.name }));
      const panel = screen.getByRole('tabpanel');

      expect(panel.querySelectorAll('[data-creep-card]')).toHaveLength(
        getUnitsByFaction(race.raceId).length,
      );
      expect(panel.querySelectorAll('[data-tower-card]')).toHaveLength(
        getBuildableTowersByFaction(race.raceId).length,
      );
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the stats, economy and tier of a creep', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const skeleton = resolveUnitConfigById('undead_skeleton');
    const economy = getTierEconomy(skeleton.tier);

    const card = within(screen.getByRole('article', { name: skeleton.name }));

    expect(card.getByLabelText(`Tier ${skeleton.tier}`).textContent).toBe(`T${skeleton.tier}`);
    expect(card.getByText('HP (wave 1)').nextElementSibling?.textContent).toBe(
      String(skeleton.health),
    );
    expect(card.getByText('Speed').nextElementSibling?.textContent).toBe(String(skeleton.speed));
    expect(card.getByText('Phys. armor').nextElementSibling?.textContent).toBe(
      String(skeleton.physicalArmor),
    );
    expect(card.getByText('Mag. armor').nextElementSibling?.textContent).toBe(
      String(skeleton.magicalArmor),
    );
    expect(card.getByText('Phys. armor').parentElement?.getAttribute('title')).toMatch(
      new RegExp(`^Physical armor ${skeleton.physicalArmor}: physical hits land for \\d+%\\.$`),
    );
    expect(card.getByText('Mag. armor').parentElement?.getAttribute('title')).toMatch(
      new RegExp(`^Magical armor ${skeleton.magicalArmor}: magical hits`),
    );
    expect(card.getByText('Size').nextElementSibling?.textContent).toBe('Small');
    expect(card.getByText('Moves').nextElementSibling?.textContent).toBe('Ground');
    expect(card.getByText('Kill reward').nextElementSibling?.textContent).toBe(
      `${skeleton.rewardGold}g`,
    );
    expect(card.getByText('Send cost').nextElementSibling?.textContent).toBe(
      `${economy.sendCost}g`,
    );
    expect(card.getByText('Income').nextElementSibling?.textContent).toBe(
      `+${economy.incomeBonus}`,
    );
    expect(card.getByText('Per wave').nextElementSibling?.textContent).toBe(
      `${economy.perWaveCap} max`,
    );
    expect(card.getByText('Unlocks').nextElementSibling?.textContent).toBe(
      `Wave ${economy.unlockWave}`,
    );
    expect(card.getByRole('img', { name: skeleton.name })).toBeDefined();
  });

  it('shows the specials and upgrade levels of a tower', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const frostNest = resolveBuildableTowerById('undead_frost_wyrm_nest');

    const card = within(screen.getByRole('article', { name: frostNest.name }));

    expect(card.getByText('Frost')).toBeDefined();
    expect(card.getByText('Cost').nextElementSibling?.textContent).toBe(`${frostNest.costGold}g`);
    expect(card.getByText('Range').nextElementSibling?.textContent).toBe(
      `${frostNest.range} cells`,
    );
    const specials = within(card.getByRole('list', { name: 'Specials' }));
    expect(specials.getByText('Chill')).toBeDefined();
    expect(specials.getByText('35% slower for 2.0s')).toBeDefined();
    const levels = within(card.getByRole('list', { name: 'Upgrade levels' }));
    expect(levels.getAllByRole('listitem')).toHaveLength(3);
    const branches = within(card.getByRole('list', { name: 'Talent branches' }));
    expect(branches.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      frostNest.talentBranches.map((branch) => branch.name),
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the damage type of a tower with a decorative glyph and a tooltip', () => {
    render(<BestiaryPage onNavigate={() => undefined} />);
    const frostNest = resolveBuildableTowerById('undead_frost_wyrm_nest');

    const card = within(screen.getByRole('article', { name: frostNest.name }));
    const value = card.getByText('Type').nextElementSibling;

    expect(value?.textContent).toBe('✦ Magical');
    expect(value?.querySelector('[aria-hidden="true"]')?.textContent).toBe('✦ ');
    expect(card.getByText('Type').parentElement?.getAttribute('title')).toBe(
      'Magical damage: reduced by magical armor.',
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('renders lore when the content carries it', () => {
    const [undead] = getAllRaceRegistries();
    const ghoul = resolveUnitConfigById('undead_ghoul');
    const viewModel = buildBestiaryViewModel({
      races: [undead],
      unitsOf: () => [{ ...ghoul, lore: 'It never stops hungering.' } as UnitConfig],
      towersOf: () => [],
    });

    render(<BestiaryPage onNavigate={() => undefined} viewModel={viewModel} />);

    expect(screen.getByText('It never stops hungering.')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
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
