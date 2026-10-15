import { useSyncExternalStore } from 'react';
import { LANDSCAPE_LAYOUT_MEDIA_QUERY } from '../../constants/layout';

function queryLandscapeLayout(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia(LANDSCAPE_LAYOUT_MEDIA_QUERY);
}

function readIsLandscapeLayout(): boolean {
  return queryLandscapeLayout()?.matches ?? false;
}

function subscribeLandscapeLayout(onStoreChange: () => void): () => void {
  const mediaQueryList = queryLandscapeLayout();
  if (!mediaQueryList) {
    return () => undefined;
  }
  mediaQueryList.addEventListener('change', onStoreChange);
  return () => mediaQueryList.removeEventListener('change', onStoreChange);
}

function readServerSnapshot(): boolean {
  return false;
}

/**
 * True while the viewport is a landscape phone. The value only changes on an
 * orientation change or a resize across the breakpoint, so the page
 * re-renders once per switch, never per frame.
 */
export function useLandscapeLayout(): boolean {
  return useSyncExternalStore(subscribeLandscapeLayout, readIsLandscapeLayout, readServerSnapshot);
}
