import { describe, expect, it } from 'vitest';
import { getRadioGroupTargetIndex } from './radioGroupNavigation';

describe('getRadioGroupTargetIndex', () => {
  it('moves forward and back with the arrows, wrapping at the ends', () => {
    expect(getRadioGroupTargetIndex('ArrowRight', 0, 4)).toBe(1);
    expect(getRadioGroupTargetIndex('ArrowDown', 3, 4)).toBe(0);
    expect(getRadioGroupTargetIndex('ArrowLeft', 0, 4)).toBe(3);
    expect(getRadioGroupTargetIndex('ArrowUp', 2, 4)).toBe(1);
  });

  it('jumps to the ends with Home and End', () => {
    expect(getRadioGroupTargetIndex('Home', 2, 4)).toBe(0);
    expect(getRadioGroupTargetIndex('End', 1, 4)).toBe(3);
  });

  it('ignores other keys and empty groups', () => {
    expect(getRadioGroupTargetIndex('Enter', 1, 4)).toBeNull();
    expect(getRadioGroupTargetIndex('ArrowRight', 0, 0)).toBeNull();
  });

  it('treats an unknown current option as the first one', () => {
    expect(getRadioGroupTargetIndex('ArrowRight', -1, 4)).toBe(1);
  });
});
