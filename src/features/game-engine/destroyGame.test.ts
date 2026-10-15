import { describe, expect, it, vi } from 'vitest';
import {
  createInitialGameHudSnapshot,
  getActiveBattlefieldView,
  getGameHudSnapshot,
  onGameEvent,
  publishGameHudSnapshot,
  requestBattlefieldView,
  subscribeGameHudSnapshot,
} from '../../shared/lib/game-bridge/bridge';
import { destroyGame } from './destroyGame';

describe('destroyGame', () => {
  it('schedules the Phaser teardown and detaches the canvas immediately', () => {
    const remove = vi.fn();
    const destroy = vi.fn();
    const canvas = { remove } as unknown as HTMLCanvasElement;

    destroyGame({ canvas, destroy });

    expect(destroy).toHaveBeenCalledWith(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('tolerates a game that never created a canvas', () => {
    const destroy = vi.fn();

    expect(() => destroyGame({ canvas: null, destroy })).not.toThrow();
    expect(destroy).toHaveBeenCalledWith(true);
  });

  it('forgets the finished match so the next page mounts neutral (stale HUD regression)', () => {
    publishGameHudSnapshot({
      ...createInitialGameHudSnapshot(),
      gold: 740,
      phase: 'wave',
      waveNumber: 7,
    });
    expect(requestBattlefieldView('opponent')).toBe(true);
    const onSnapshot = vi.fn();
    const onSelectedTower = vi.fn();
    const stopSnapshot = subscribeGameHudSnapshot(onSnapshot);
    const stopSelected = onGameEvent('selected-tower', onSelectedTower);

    destroyGame({ canvas: null, destroy: vi.fn() });

    expect(getGameHudSnapshot()).toEqual(createInitialGameHudSnapshot());
    expect(getActiveBattlefieldView()).toBe('player');
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSelectedTower).toHaveBeenCalledWith({ tower: null });
    stopSnapshot();
    stopSelected();
  });
});
