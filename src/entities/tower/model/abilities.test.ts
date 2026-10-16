import { describe, expect, it } from 'vitest';
import {
  isCriticalShot,
  isPointOnPierceLine,
  resolveShotDamageMultiplier,
  resolveTargetDamageMultiplier,
} from './abilities';
import { UnitMoveType, UnitSizeClass } from '../../../shared/types/content-ids';

const GROUND_MEDIUM = {
  moveType: UnitMoveType.GROUND,
  sizeClass: UnitSizeClass.MEDIUM,
  hp: 50,
  maxHp: 100,
};

describe('resolveTargetDamageMultiplier', () => {
  it('is 1 without abilities or without any target ability', () => {
    expect(resolveTargetDamageMultiplier(undefined, GROUND_MEDIUM)).toBe(1);
    expect(resolveTargetDamageMultiplier({ extraTargets: 2 }, GROUND_MEDIUM)).toBe(1);
  });

  it('applies the air or the ground multiplier by move type', () => {
    const abilities = { airDamageMultiplier: 2, groundDamageMultiplier: 0.5 };
    expect(resolveTargetDamageMultiplier(abilities, GROUND_MEDIUM)).toBe(0.5);
    expect(
      resolveTargetDamageMultiplier(abilities, { ...GROUND_MEDIUM, moveType: UnitMoveType.AIR }),
    ).toBe(2);
  });

  it('applies the full-health bonus only at full health (or with no maximum recorded)', () => {
    const abilities = { fullHealthBonusMultiplier: 3 };
    expect(resolveTargetDamageMultiplier(abilities, GROUND_MEDIUM)).toBe(1);
    expect(resolveTargetDamageMultiplier(abilities, { ...GROUND_MEDIUM, hp: 100 })).toBe(3);
    expect(resolveTargetDamageMultiplier(abilities, { ...GROUND_MEDIUM, maxHp: undefined })).toBe(
      3,
    );
  });

  it('applies the large-target multiplier to large creeps only, multiplying with the rest', () => {
    const abilities = { largeTargetMultiplier: 1.5, groundDamageMultiplier: 2 };
    expect(resolveTargetDamageMultiplier(abilities, GROUND_MEDIUM)).toBe(2);
    expect(
      resolveTargetDamageMultiplier(abilities, {
        ...GROUND_MEDIUM,
        sizeClass: UnitSizeClass.LARGE,
      }),
    ).toBe(3);
  });
});

describe('critical shots', () => {
  it('crits every Nth shot by counter', () => {
    const abilities = { critEveryNthShot: 3, critMultiplier: 2 };
    const crits = [1, 2, 3, 4, 5, 6].map((shot) => isCriticalShot(abilities, shot));
    expect(crits).toEqual([false, false, true, false, false, true]);
    expect(resolveShotDamageMultiplier(abilities, 3)).toBe(2);
    expect(resolveShotDamageMultiplier(abilities, 4)).toBe(1);
  });

  it('never crits without the ability', () => {
    expect(isCriticalShot(undefined, 3)).toBe(false);
    expect(resolveShotDamageMultiplier({}, 10)).toBe(1);
  });
});

describe('isPointOnPierceLine', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 4, y: 0 };

  it('accepts points within half a cell of the segment', () => {
    expect(isPointOnPierceLine(from, to, { x: 2, y: 0 })).toBe(true);
    expect(isPointOnPierceLine(from, to, { x: 2, y: 0.5 })).toBe(true);
    expect(isPointOnPierceLine(from, to, { x: 4.3, y: 0 })).toBe(true);
  });

  it('rejects points off the line or beyond either end', () => {
    expect(isPointOnPierceLine(from, to, { x: 2, y: 0.6 })).toBe(false);
    expect(isPointOnPierceLine(from, to, { x: 5, y: 0 })).toBe(false);
    expect(isPointOnPierceLine(from, to, { x: -1, y: 0 })).toBe(false);
  });

  it('treats a zero-length line as its end point', () => {
    expect(isPointOnPierceLine(from, from, { x: 0.4, y: 0 })).toBe(true);
    expect(isPointOnPierceLine(from, from, { x: 1, y: 0 })).toBe(false);
  });
});
