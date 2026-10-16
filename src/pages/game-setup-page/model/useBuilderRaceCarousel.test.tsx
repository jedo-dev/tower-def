// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { builderFactions } from '../../../entities/builder-faction';
import { RACE_FADE_DURATION_MS, useBuilderRaceCarousel } from './useBuilderRaceCarousel';

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  vi.useRealTimers();
  consoleError.mockClear();
});

describe('useBuilderRaceCarousel', () => {
  it('fades out, then switches to the previous race with wrap-around', () => {
    vi.useFakeTimers();
    const setBuilderRace = vi.fn();
    const { result } = renderHook(() =>
      useBuilderRaceCarousel(builderFactions[0].id, setBuilderRace),
    );

    act(() => result.current.switchRace('prev'));
    expect(result.current.isRaceVisible).toBe(false);
    expect(setBuilderRace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(RACE_FADE_DURATION_MS));
    expect(setBuilderRace).toHaveBeenCalledWith(builderFactions[builderFactions.length - 1].id);
    expect(result.current.isRaceVisible).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('cancels a pending switch when unmounted', () => {
    vi.useFakeTimers();
    const setBuilderRace = vi.fn();
    const { result, unmount } = renderHook(() =>
      useBuilderRaceCarousel(builderFactions[0].id, setBuilderRace),
    );

    act(() => result.current.switchRace('next'));
    unmount();
    vi.advanceTimersByTime(RACE_FADE_DURATION_MS);
    expect(setBuilderRace).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
