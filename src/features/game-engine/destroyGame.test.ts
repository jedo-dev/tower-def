import { describe, expect, it, vi } from 'vitest';
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
});
