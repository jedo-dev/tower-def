// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TowerIcon } from './TowerIcon';
import { PLACEHOLDER_ICON_GLYPH } from '../../placeholder-icon';
import { TOWER_SPRITE_ASSETS, TOWER_SPRITE_KEYS } from '../../../constants/sprites';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TowerIcon', () => {
  it('shows the first idle frame of the tower sheet', () => {
    const consoleError = vi.spyOn(console, 'error');

    render(<TowerIcon spriteKey={TOWER_SPRITE_KEYS.ELF_MOON_ARCHER} label="Moon Archer" />);

    const icon = screen.getByRole('img', { name: 'Moon Archer' });

    expect(icon.style.backgroundImage).toContain(
      TOWER_SPRITE_ASSETS[TOWER_SPRITE_KEYS.ELF_MOON_ARCHER],
    );
    expect(icon.style.getPropertyValue('--tower-icon-columns')).toBe('5');
    expect(icon.style.getPropertyValue('--tower-icon-rows')).toBe('3');
    // Idle starts in slot 3: fourth column of the first row.
    expect(icon.style.getPropertyValue('--tower-icon-column')).toBe('3');
    expect(icon.style.getPropertyValue('--tower-icon-row')).toBe('0');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('falls back to the question chip while a tower has no art', () => {
    render(<TowerIcon spriteKey="tower.elf.thorn_spire" label="Thorn Spire" faction="elf" />);

    const icon = screen.getByRole('img', { name: 'Thorn Spire: artwork pending' });

    expect(icon.textContent).toBe(PLACEHOLDER_ICON_GLYPH);
  });

  it('claims a touch target when it stands alone inside a control', () => {
    const { container } = render(
      <TowerIcon
        spriteKey={TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER}
        label="Bone Archer"
        interactive
      />,
    );

    expect((container.firstElementChild as HTMLElement).className).toMatch(/iconInteractive/);
  });
});
