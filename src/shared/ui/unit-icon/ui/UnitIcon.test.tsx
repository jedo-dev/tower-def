// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UnitIcon } from './UnitIcon';
import { PLACEHOLDER_ICON_GLYPH } from '../../placeholder-icon';
import { UNIT_SPRITE_ASSETS, UNIT_SPRITE_KEYS } from '../../../constants/sprites';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

function failPortrait(icon: HTMLElement): void {
  const image = icon.querySelector('img');
  if (!image) throw new Error('portrait not rendered');
  fireEvent.error(image);
}

describe('UnitIcon', () => {
  it('shows the painted portrait by the unit id', () => {
    render(<UnitIcon unitId="orc_grunt" label="Grunt" />);

    const icon = screen.getByRole('img', { name: 'Grunt' });
    const image = icon.querySelector('img');

    expect(image?.getAttribute('src')).toBe('/assets/ui/portraits/orc_grunt.webp');
    expect(image?.getAttribute('alt')).toBe('');
    expect(icon.style.backgroundImage).toBe('');
  });

  it('falls back to the camera-facing sprite frame when the portrait fails', () => {
    render(<UnitIcon unitId="orc_grunt" label="Grunt" />);
    failPortrait(screen.getByRole('img', { name: 'Grunt' }));

    const icon = screen.getByRole('img', { name: 'Grunt' });

    expect(icon.querySelector('img')).toBeNull();
    expect(icon.style.backgroundImage).toContain(UNIT_SPRITE_ASSETS[UNIT_SPRITE_KEYS.ORC_GRUNT]);
    expect(icon.style.getPropertyValue('--unit-icon-columns')).toBe('4');
    expect(icon.style.getPropertyValue('--unit-icon-rows')).toBe('4');
  });

  it('reads a legacy strip as a single row, so the fallback frame is not squashed', () => {
    render(<UnitIcon unitId="undead_skeleton" label="Skeleton" />);
    failPortrait(screen.getByRole('img', { name: 'Skeleton' }));

    const icon = screen.getByRole('img', { name: 'Skeleton' });

    expect(icon.style.getPropertyValue('--unit-icon-rows')).toBe('1');
  });

  it('falls back to the question chip when the unit has neither portrait nor sheet', () => {
    render(<UnitIcon unitId="unknown_unit" label="Unknown" faction="human" />);
    failPortrait(screen.getByRole('img', { name: 'Unknown' }));

    const icon = screen.getByRole('img', { name: 'Unknown: artwork pending' });

    expect(icon.textContent).toBe(PLACEHOLDER_ICON_GLYPH);
  });

  it('tries the portrait again when it is reused for another unit', () => {
    const { rerender } = render(<UnitIcon unitId="unknown_unit" label="Unknown" />);
    failPortrait(screen.getByRole('img', { name: 'Unknown' }));

    rerender(<UnitIcon unitId="orc_troll" label="Troll" />);

    expect(
      screen.getByRole('img', { name: 'Troll' }).querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/ui/portraits/orc_troll.webp');
  });

  it('claims a touch target when it stands alone inside a control', () => {
    const { container } = render(<UnitIcon unitId="orc_troll" label="Troll" interactive />);

    expect((container.firstElementChild as HTMLElement).className).toMatch(/iconInteractive/);
  });
});
