// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { onGameEvent, publishGameEvent } from '../../../../shared/lib/game-bridge/bridge';
import { useOpponentFieldRemainingCreeps } from '../../../../shared/lib/game-bridge/useOpponentFieldCreeps';
import {
  countFieldRemainingCreeps,
  createOpponentFieldCreepsPublisher,
} from './opponentFieldCreepsPublisher';

function createFieldCreeps(statuses: ReadonlyArray<'alive' | 'dead' | 'escaped'>) {
  return statuses.map((status) => ({ entity: { status } }));
}

describe('opponent field creeps bridge integration', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    act(() => publishGameEvent('opponent-field-creeps-updated', { remaining: 0 }));
    consoleError.mockClear();
  });

  it('carries the scene-side count to React through the typed event, on change only', () => {
    const eventHandler = vi.fn();
    const unsubscribe = onGameEvent('opponent-field-creeps-updated', eventHandler);
    // Wired exactly as the scene does: the runtime publisher feeds the typed bridge.
    const publisher = createOpponentFieldCreepsPublisher((remaining) =>
      publishGameEvent('opponent-field-creeps-updated', { remaining }),
    );
    const { result } = renderHook(() => useOpponentFieldRemainingCreeps());

    expect(result.current).toBe(0);

    // Wave start: two on the field, three still scheduled.
    act(() =>
      publisher.update(countFieldRemainingCreeps(createFieldCreeps(['alive', 'alive']), 3)),
    );
    expect(result.current).toBe(5);

    // A spawn moves a creep from the schedule onto the field: nothing to emit.
    act(() =>
      publisher.update(
        countFieldRemainingCreeps(createFieldCreeps(['alive', 'alive', 'alive']), 2),
      ),
    );
    // A kill and a leak each lower the count.
    act(() =>
      publisher.update(countFieldRemainingCreeps(createFieldCreeps(['dead', 'alive', 'alive']), 2)),
    );
    act(() =>
      publisher.update(
        countFieldRemainingCreeps(createFieldCreeps(['dead', 'escaped', 'alive']), 2),
      ),
    );

    expect(result.current).toBe(3);
    expect(eventHandler.mock.calls.map(([payload]) => payload)).toEqual([
      { remaining: 5 },
      { remaining: 4 },
      { remaining: 3 },
    ]);
    expect(consoleError).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('keeps the latest count published before the widget mounted', () => {
    publishGameEvent('opponent-field-creeps-updated', { remaining: 7 });

    const { result } = renderHook(() => useOpponentFieldRemainingCreeps());

    expect(result.current).toBe(7);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
