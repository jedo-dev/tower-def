// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TowerIcon } from './TowerIcon';
import { PLACEHOLDER_ICON_GLYPH } from '../../placeholder-icon';
import { TOWER_SPRITE_ASSETS, TOWER_SPRITE_KEYS } from '../../../constants/sprites';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

function failIcon(icon: HTMLElement): void {
  const image = icon.querySelector('img');
  if (!image) throw new Error('painted icon not rendered');
  fireEvent.error(image);
}

describe('TowerIcon', () => {
  it('shows the painted icon by the race tower id', () => {
    render(
      <TowerIcon
        towerId="orc_tar_pit"
        spriteKey={TOWER_SPRITE_KEYS.ELF_MOON_ARCHER}
        label="Tar Pit"
      />,
    );

    const icon = screen.getByRole('img', { name: 'Tar Pit' });
    const image = icon.querySelector('img');

    expect(image?.getAttribute('src')).toBe('/assets/ui/tower-icons/orc_tar_pit.webp');
    expect(image?.getAttribute('alt')).toBe('');
    expect(icon.style.backgroundImage).toBe('');
  });

  it('falls back to the first idle frame of the tower sheet when the icon fails', () => {
    render(
      <TowerIcon
        towerId="elf_moon_archer_tower"
        spriteKey={TOWER_SPRITE_KEYS.ELF_MOON_ARCHER}
        label="Moon Archer"
      />,
    );
    failIcon(screen.getByRole('img', { name: 'Moon Archer' }));

    const icon = screen.getByRole('img', { name: 'Moon Archer' });

    expect(icon.querySelector('img')).toBeNull();
    expect(icon.style.backgroundImage).toContain(
      TOWER_SPRITE_ASSETS[TOWER_SPRITE_KEYS.ELF_MOON_ARCHER],
    );
    expect(icon.style.getPropertyValue('--tower-icon-columns')).toBe('5');
    expect(icon.style.getPropertyValue('--tower-icon-rows')).toBe('3');
    // Idle starts in slot 3: fourth column of the first row.
    expect(icon.style.getPropertyValue('--tower-icon-column')).toBe('3');
    expect(icon.style.getPropertyValue('--tower-icon-row')).toBe('0');
  });

  it('falls back to the question chip when the tower has neither icon nor sheet', () => {
    render(
      <TowerIcon towerId="unknown_tower" spriteKey="tower.unknown" label="Unknown" faction="elf" />,
    );
    failIcon(screen.getByRole('img', { name: 'Unknown' }));

    const icon = screen.getByRole('img', { name: 'Unknown: artwork pending' });

    expect(icon.textContent).toBe(PLACEHOLDER_ICON_GLYPH);
  });

  it('uses the sheet frame straight away when no tower id is known', () => {
    render(<TowerIcon spriteKey={TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER} label="Archer Tower" />);

    const icon = screen.getByRole('img', { name: 'Archer Tower' });

    expect(icon.querySelector('img')).toBeNull();
    expect(icon.style.backgroundImage).toContain(
      TOWER_SPRITE_ASSETS[TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER],
    );
  });

  it('tries the painted icon again when it is reused for another tower', () => {
    const { rerender } = render(<TowerIcon towerId="unknown_tower" label="Unknown" />);
    failIcon(screen.getByRole('img', { name: 'Unknown' }));

    rerender(<TowerIcon towerId="human_guard_post" label="Guard Post" />);

    expect(
      screen.getByRole('img', { name: 'Guard Post' }).querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/ui/tower-icons/human_guard_post.webp');
  });

  it('claims a touch target when it stands alone inside a control', () => {
    const { container } = render(
      <TowerIcon towerId="undead_bone_archer_tower" label="Bone Archer" interactive />,
    );

    expect((container.firstElementChild as HTMLElement).className).toMatch(/iconInteractive/);
  });
});
