// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FactionEmblem } from './FactionEmblem';
import { RaceId } from '../../../types/content-ids';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockClear();
});

describe('FactionEmblem', () => {
  it('shows the race emblem with the race name as alternative text', () => {
    render(<FactionEmblem race={RaceId.ORC} size={32} />);

    const emblem = screen.getByRole('img', { name: 'Orc' });

    expect(emblem.getAttribute('src')).toBe('/assets/ui/factions/orc.webp');
    expect(emblem.getAttribute('width')).toBe('32');
    expect(emblem.style.getPropertyValue('--faction-emblem-size')).toBe('32px');
  });

  it('hides a decorative emblem from assistive technology', () => {
    const { container } = render(<FactionEmblem race={RaceId.ELF} size={20} decorative />);

    const emblem = container.querySelector('img');

    expect(emblem?.getAttribute('alt')).toBe('');
    expect(emblem?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to the initial letter when the emblem fails to load', () => {
    render(<FactionEmblem race={RaceId.HUMAN} size={40} />);
    fireEvent.error(screen.getByRole('img', { name: 'Human' }));

    const fallback = screen.getByRole('img', { name: 'Human' });

    expect(fallback.tagName).toBe('SPAN');
    expect(fallback.textContent).toBe('H');
  });

  it('shows the new emblem when the race changes after a failure', () => {
    const { rerender } = render(<FactionEmblem race={RaceId.UNDEAD} size={24} />);
    fireEvent.error(screen.getByRole('img', { name: 'Undead' }));
    rerender(<FactionEmblem race={RaceId.ORC} size={24} />);

    expect(screen.getByRole('img', { name: 'Orc' }).tagName).toBe('IMG');
  });
});
