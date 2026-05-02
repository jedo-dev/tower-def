import { describe, expect, it } from 'vitest';
import { ECONOMY_BALANCE } from '../../../shared/constants/economy';
import { createInitialPlayerResources } from './state';

describe('player resources model', () => {
  it('creates initial resources from centralized economy balance', () => {
    const resources = createInitialPlayerResources();

    expect(resources.gold).toBe(ECONOMY_BALANCE.startingGold);
    expect(resources.lives).toBe(ECONOMY_BALANCE.startingLives);
  });
});
