// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { UnitIcon } from './UnitIcon';
import { PLACEHOLDER_ICON_GLYPH } from '../../placeholder-icon';
import { UNIT_SPRITE_ASSETS, UNIT_SPRITE_KEYS } from '../../../constants/sprites';

afterEach(cleanup);

describe('UnitIcon', () => {
  it('shows the camera-facing frame of a four-row sheet', () => {
    render(<UnitIcon unitId="orc_grunt" label="Grunt" />);

    const icon = screen.getByRole('img', { name: 'Grunt' });

    expect(icon.style.backgroundImage).toContain(UNIT_SPRITE_ASSETS[UNIT_SPRITE_KEYS.ORC_GRUNT]);
    expect(icon.style.getPropertyValue('--unit-icon-columns')).toBe('4');
    expect(icon.style.getPropertyValue('--unit-icon-rows')).toBe('4');
    expect(icon.style.backgroundPosition).toBe('');
  });

  it('reads a legacy strip as a single row, so the frame is not squashed', () => {
    render(<UnitIcon unitId="undead_skeleton" label="Skeleton" />);

    const icon = screen.getByRole('img', { name: 'Skeleton' });

    expect(icon.style.getPropertyValue('--unit-icon-rows')).toBe('1');
  });

  it('falls back to the question chip while a unit has no art', () => {
    render(<UnitIcon unitId="human_footman" label="Footman" faction="human" />);

    const icon = screen.getByRole('img', { name: 'Footman: artwork pending' });

    expect(icon.textContent).toBe(PLACEHOLDER_ICON_GLYPH);
    expect(icon.style.backgroundImage).toBe('');
  });

  it('claims a touch target when it stands alone inside a control', () => {
    const { container } = render(<UnitIcon unitId="orc_troll" label="Troll" interactive />);

    expect((container.firstElementChild as HTMLElement).className).toMatch(/iconInteractive/);
  });
});
