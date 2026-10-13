import { describe, expect, it, vi } from 'vitest';
import { createGridModel } from '../../../grid/createGridModel';
import { createDefaultEdgeEndpoints } from '../../../grid/generateEdgeEndpoints';
import type { WaveRoutes } from '../../../pathfinding/waveRoutes';
import {
  createBuildRoutePreviewCache,
  HIDDEN_ROUTE_PREVIEW,
  invalidateBuildRoutePreview,
  resolveRoutePreviewFrame,
  type BuildRoutePreviewSearches,
} from './buildRoutePreviewModel';

const GRID = createGridModel(createDefaultEdgeEndpoints());
const CURRENT: WaveRoutes = { small: [{ x: 0, y: 0 }], large: [{ x: 0, y: 0 }] };
const PROJECTED: WaveRoutes = { small: [{ x: 1, y: 1 }], large: [{ x: 1, y: 1 }] };

function createCountingSearches() {
  const searches = {
    current: vi.fn(() => CURRENT),
    projected: vi.fn(() => PROJECTED),
  } satisfies BuildRoutePreviewSearches;
  return searches;
}

function input(overrides: Partial<Parameters<typeof resolveRoutePreviewFrame>[1]> = {}) {
  return {
    grid: GRID,
    isBuildPhase: true,
    hoveredAnchor: { x: 4, y: 4 },
    isHoveredAnchorValid: true,
    ...overrides,
  };
}

describe('build route preview model', () => {
  it('hides the routes outside the build phase without searching', () => {
    const searches = createCountingSearches();
    const cache = createBuildRoutePreviewCache(searches);

    expect(resolveRoutePreviewFrame(cache, input({ isBuildPhase: false }))).toBe(
      HIDDEN_ROUTE_PREVIEW,
    );
    expect(searches.current).not.toHaveBeenCalled();
  });

  it('shows current routes, plus the projection for a valid hovered build', () => {
    const cache = createBuildRoutePreviewCache(createCountingSearches());

    expect(resolveRoutePreviewFrame(cache, input())).toEqual({
      isVisible: true,
      current: CURRENT,
      projected: PROJECTED,
    });
    expect(resolveRoutePreviewFrame(cache, input({ isHoveredAnchorValid: false })).projected).toBe(
      null,
    );
    expect(resolveRoutePreviewFrame(cache, input({ hoveredAnchor: null })).projected).toBe(null);
  });

  it('searches again only when the hovered anchor changes', () => {
    const searches = createCountingSearches();
    const cache = createBuildRoutePreviewCache(searches);

    for (let move = 0; move < 5; move += 1) {
      resolveRoutePreviewFrame(cache, input({ hoveredAnchor: { x: 4, y: 4 } }));
    }
    resolveRoutePreviewFrame(cache, input({ hoveredAnchor: { x: 6, y: 4 } }));

    expect(searches.current).toHaveBeenCalledTimes(1);
    expect(searches.projected).toHaveBeenCalledTimes(2);
  });

  it('recomputes everything after the layout changes', () => {
    const searches = createCountingSearches();
    const cache = createBuildRoutePreviewCache(searches);

    resolveRoutePreviewFrame(cache, input());
    invalidateBuildRoutePreview(cache);
    resolveRoutePreviewFrame(cache, input());
    resolveRoutePreviewFrame(cache, input({ grid: createGridModel(createDefaultEdgeEndpoints()) }));

    expect(searches.current).toHaveBeenCalledTimes(3);
    expect(searches.projected).toHaveBeenCalledTimes(3);
  });

  it('uses the real route searches by default', () => {
    const cache = createBuildRoutePreviewCache();
    const frame = resolveRoutePreviewFrame(cache, input({ hoveredAnchor: { x: 6, y: 3 } }));

    expect(frame.current?.small.length).toBeGreaterThan(0);
    expect(frame.current?.large.length).toBeGreaterThan(0);
    expect(frame.projected?.small.length).toBeGreaterThan(0);
  });
});
