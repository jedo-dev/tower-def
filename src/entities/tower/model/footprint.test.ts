import { describe, expect, it } from 'vitest';
import { getTowerCenter, isTowerCoveringCell } from './footprint';

describe('entities/tower/footprint', () => {
  const tower = { position: { x: 4, y: 6 } };

  it('centres a tower on its 2x2 footprint', () => {
    expect(getTowerCenter(tower)).toEqual({ x: 4.5, y: 6.5 });
  });

  it('covers exactly the four cells from its anchor', () => {
    expect(isTowerCoveringCell(tower, { x: 4, y: 6 })).toBe(true);
    expect(isTowerCoveringCell(tower, { x: 5, y: 6 })).toBe(true);
    expect(isTowerCoveringCell(tower, { x: 4, y: 7 })).toBe(true);
    expect(isTowerCoveringCell(tower, { x: 5, y: 7 })).toBe(true);
    expect(isTowerCoveringCell(tower, { x: 6, y: 6 })).toBe(false);
    expect(isTowerCoveringCell(tower, { x: 3, y: 6 })).toBe(false);
    expect(isTowerCoveringCell(tower, { x: 4, y: 8 })).toBe(false);
  });
});
