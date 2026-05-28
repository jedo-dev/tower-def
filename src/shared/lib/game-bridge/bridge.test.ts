import { describe, expect, it, vi } from 'vitest';
import { onGameEvent, publishGameEvent } from './bridge';
import type { SelectedTowerSnapshot } from './types';

function createTestTowerSnapshot(overrides?: Partial<SelectedTowerSnapshot>): SelectedTowerSnapshot {
  return {
    id: 'tower:5:3',
    type: 'archer',
    level: 1,
    position: { x: 5, y: 3 },
    cost: 50,
    combatStats: {
      damage: 20,
      range: 3,
      attackCooldownMs: 800,
    },
    ...overrides,
  };
}

describe('game bridge event system', () => {
  it('delivers selected-tower event to subscriber', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ tower });

    unsubscribe();
  });

  it('delivers null tower in selected-tower event for deselection', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    publishGameEvent('selected-tower', { tower: null });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ tower: null });

    unsubscribe();
  });

  it('stops delivering events after unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    unsubscribe();

    publishGameEvent('selected-tower', { tower: createTestTowerSnapshot() });

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsubscribe1 = onGameEvent('selected-tower', handler1);
    const unsubscribe2 = onGameEvent('selected-tower', handler2);

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();

    unsubscribe1();
    unsubscribe2();
  });

  it('unsubscribing one subscriber does not affect another', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsubscribe1 = onGameEvent('selected-tower', handler1);
    const unsubscribe2 = onGameEvent('selected-tower', handler2);

    unsubscribe1();

    const tower = createTestTowerSnapshot();
    publishGameEvent('selected-tower', { tower });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledOnce();

    unsubscribe2();
  });

  it('selected-tower event carries correct tower snapshot data', () => {
    const handler = vi.fn();
    const unsubscribe = onGameEvent('selected-tower', handler);

    const tower = createTestTowerSnapshot({
      id: 'tower:2:7',
      type: 'splash',
      level: 3,
      position: { x: 2, y: 7 },
      cost: 75,
      combatStats: {
        damage: 38,
        range: 2.9,
        attackCooldownMs: 1100,
        splashRadius: 1.5,
      },
    });

    publishGameEvent('selected-tower', { tower });

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as { tower: SelectedTowerSnapshot };
    expect(payload.tower.id).toBe('tower:2:7');
    expect(payload.tower.type).toBe('splash');
    expect(payload.tower.level).toBe(3);
    expect(payload.tower.position).toEqual({ x: 2, y: 7 });
    expect(payload.tower.cost).toBe(75);
    expect(payload.tower.combatStats.damage).toBe(38);
    expect(payload.tower.combatStats.splashRadius).toBe(1.5);

    unsubscribe();
  });
});
