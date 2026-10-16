// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { LANDSCAPE_LAYOUT_MEDIA_QUERY } from '../../constants/layout';
import { useLandscapeLayout } from './useLandscapeLayout';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** A controllable stand-in for jsdom's missing `matchMedia`. */
function installFakeMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mediaQueryList = {
    matches: initialMatches,
    media: LANDSCAPE_LAYOUT_MEDIA_QUERY,
    addEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.delete(listener);
    },
  };
  const matchMedia = vi.fn((query: string) => {
    expect(query).toBe(LANDSCAPE_LAYOUT_MEDIA_QUERY);
    return mediaQueryList as unknown as MediaQueryList;
  });
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    setMatches(matches: boolean) {
      mediaQueryList.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    listenerCount: () => listeners.size,
  };
}

function Probe() {
  const isLandscape = useLandscapeLayout();
  return <p>{isLandscape ? 'landscape' : 'portrait'}</p>;
}

describe('useLandscapeLayout', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    consoleError.mockClear();
  });

  it('is false where matchMedia is unavailable', () => {
    render(<Probe />);
    expect(screen.getByText('portrait')).toBeDefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('follows the landscape media query and unsubscribes on unmount', () => {
    const fakeMedia = installFakeMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('portrait')).toBeDefined();

    act(() => fakeMedia.setMatches(true));
    expect(screen.getByText('landscape')).toBeDefined();

    act(() => fakeMedia.setMatches(false));
    expect(screen.getByText('portrait')).toBeDefined();

    unmount();
    expect(fakeMedia.listenerCount()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
