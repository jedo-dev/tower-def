import { describe, expect, it } from 'vitest';
import {
  addGold,
  applyEarlyWaveStartBonusPlaceholder,
  canSpendGold,
  isGameOverByLives,
  spendGold,
  subtractLives,
} from './economy';

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
    const result = spendGold({ gold: 100, lives: 20 }, 40);

    expect(result.spent).toBe(true);
    expect(result.resources.gold).toBe(60);
    expect(result.resources.lives).toBe(20);
  });

  it('keeps resources unchanged when spend fails', () => {
    const resources = { gold: 10, lives: 20 };
    const result = spendGold(resources, 99);

    expect(result.spent).toBe(false);
    expect(result.resources).toEqual(resources);
  });

  it('adds gold reward to resources', () => {
    const resources = { gold: 45, lives: 20 };
    const nextResources = addGold(resources, 12);

    expect(nextResources.gold).toBe(57);
    expect(nextResources.lives).toBe(20);
  });

  it('keeps resources unchanged when reward is non-positive', () => {
    const resources = { gold: 45, lives: 20 };

    expect(addGold(resources, 0)).toEqual(resources);
    expect(addGold(resources, -3)).toEqual(resources);
  });

  it('subtracts life when creep reaches exit', () => {
    const resources = { gold: 45, lives: 3 };
    const nextResources = subtractLives(resources, 1);

    expect(nextResources.lives).toBe(2);
    expect(nextResources.gold).toBe(45);
  });

  it('does not allow lives to go below zero', () => {
    const resources = { gold: 45, lives: 1 };
    const nextResources = subtractLives(resources, 5);

    expect(nextResources.lives).toBe(0);
  });

  it('enters game-over when lives are zero or below', () => {
    expect(isGameOverByLives({ lives: 0 })).toBe(true);
    expect(isGameOverByLives({ lives: -1 })).toBe(true);
    expect(isGameOverByLives({ lives: 1 })).toBe(false);
  });

  it('grants early wave start bonus only when eligible', () => {
    const resources = { gold: 50, lives: 20 };

    const notGranted = applyEarlyWaveStartBonusPlaceholder(resources, 15, false);
    expect(notGranted.granted).toBe(false);
    expect(notGranted.resources).toEqual(resources);

    const granted = applyEarlyWaveStartBonusPlaceholder(resources, 15, true);
    expect(granted.granted).toBe(true);
    expect(granted.resources.gold).toBe(65);
  });

  it('player can lose after enough escaped creeps', () => {
    let resources = { gold: 100, lives: 3 };

    resources = subtractLives(resources, 1);
    expect(isGameOverByLives(resources)).toBe(false);

    resources = subtractLives(resources, 1);
    expect(isGameOverByLives(resources)).toBe(false);

    resources = subtractLives(resources, 1);
    expect(isGameOverByLives(resources)).toBe(true);
    expect(resources.lives).toBe(0);
  });
});
