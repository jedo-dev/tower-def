import { describe, expect, it } from 'vitest';
import { addGold, applyEarlyWaveStartBonusPlaceholder, canSpendGold, spendGold } from './economy';

describe('player resources gold spending validation', () => {
  it('allows spending when gold is enough', () => {
    expect(canSpendGold({ gold: 100 }, 75)).toBe(true);
  });

  it('rejects spending when gold is not enough', () => {
    expect(canSpendGold({ gold: 40 }, 41)).toBe(false);
  });

  it('allows zero or negative spend amount', () => {
    expect(canSpendGold({ gold: 0 }, 0)).toBe(true);
    expect(canSpendGold({ gold: 0 }, -10)).toBe(true);
  });

  it('subtracts gold when spend succeeds', () => {
    const result = spendGold({ gold: 100 }, 40);

    expect(result.spent).toBe(true);
    expect(result.resources.gold).toBe(60);
  });

  it('keeps resources unchanged when spend fails', () => {
    const resources = { gold: 10 };
    const result = spendGold(resources, 99);

    expect(result.spent).toBe(false);
    expect(result.resources).toEqual(resources);
  });

  it('adds gold reward to resources', () => {
    const resources = { gold: 45 };
    const nextResources = addGold(resources, 12);

    expect(nextResources.gold).toBe(57);
  });

  it('keeps resources unchanged when reward is non-positive', () => {
    const resources = { gold: 45 };

    expect(addGold(resources, 0)).toEqual(resources);
    expect(addGold(resources, -3)).toEqual(resources);
  });

  it('grants early wave start bonus only when eligible', () => {
    const resources = { gold: 50 };

    const notGranted = applyEarlyWaveStartBonusPlaceholder(resources, 15, false);
    expect(notGranted.granted).toBe(false);
    expect(notGranted.resources).toEqual(resources);

    const granted = applyEarlyWaveStartBonusPlaceholder(resources, 15, true);
    expect(granted.granted).toBe(true);
    expect(granted.resources.gold).toBe(65);
  });
});
