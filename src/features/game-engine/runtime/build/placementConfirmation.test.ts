import { describe, expect, it } from 'vitest';
import { isSameAnchor, resolvePlacementTap } from './placementConfirmation';

describe('resolvePlacementTap', () => {
  it('arms the first tapped block', () => {
    expect(resolvePlacementTap(null, { x: 4, y: 6 })).toEqual({
      kind: 'arm',
      anchor: { x: 4, y: 6 },
    });
  });

  it('confirms a second tap on the armed block and re-arms elsewhere', () => {
    expect(resolvePlacementTap({ x: 4, y: 6 }, { x: 4, y: 6 })).toEqual({
      kind: 'confirm',
      anchor: { x: 4, y: 6 },
    });
    expect(resolvePlacementTap({ x: 4, y: 6 }, { x: 5, y: 6 })).toEqual({
      kind: 'arm',
      anchor: { x: 5, y: 6 },
    });
  });
});

describe('isSameAnchor', () => {
  it('compares by cell and treats a missing anchor as different', () => {
    expect(isSameAnchor({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(isSameAnchor({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
    expect(isSameAnchor(null, { x: 1, y: 2 })).toBe(false);
    expect(isSameAnchor(null, null)).toBe(false);
  });
});
