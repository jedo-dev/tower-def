import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { WaveRoutes } from '../../../../shared/lib/pathfinding/waveRoutes';
import { HIDDEN_ROUTE_PREVIEW, type RoutePreviewFrame } from './buildRoutePreviewModel';
import {
  createRoutePreviewRenderState,
  renderRoutePreview,
  type RoutePreviewConfig,
} from './routePreviewRenderer';

const CELL = GRID_DIMENSIONS.cellSize;
const SMALL_COLOR = 0x00aaff;
const LARGE_COLOR = 0xffaa00;
const AIR_COLOR = 0xccccff;
const CONFIG: RoutePreviewConfig = {
  smallRouteColor: SMALL_COLOR,
  smallRouteAlpha: 1,
  smallRouteDotRadiusPx: 2,
  smallRouteDotsPerStep: 2,
  largeRouteColor: LARGE_COLOR,
  largeRouteBandAlpha: 0.2,
  largeRouteSpineWidthPx: 2,
  largeRouteSpineAlpha: 0.8,
  ghostAlphaFactor: 0.5,
  airRouteColor: AIR_COLOR,
  airRouteAlpha: 0.4,
  airRouteWidthPx: 1,
  airRouteDashPx: CELL,
  airRouteGapPx: CELL,
};

const ROUTES: WaveRoutes = {
  small: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  large: [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  air: [
    { x: 0, y: 4 },
    { x: 2, y: 4 },
  ],
};

function createGraphicsMock() {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillCircle: vi.fn(),
    fillRect: vi.fn(),
    lineStyle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokePath: vi.fn(),
  };
  return graphics;
}

function setup() {
  const graphics = createGraphicsMock();
  const state = createRoutePreviewRenderState();
  state.graphics = graphics as unknown as Phaser.GameObjects.Graphics;
  return { graphics, state };
}

const VISIBLE: RoutePreviewFrame = {
  isVisible: true,
  current: ROUTES,
  projected: null,
  showsAirRoute: false,
};

describe('route preview renderer', () => {
  it('draws small routes as dots through cell centres', () => {
    const { graphics, state } = setup();

    renderRoutePreview(state, VISIBLE, CONFIG);

    // Two steps x two dots, plus the exit dot.
    expect(graphics.fillCircle).toHaveBeenCalledTimes(5);
    expect(graphics.fillCircle).toHaveBeenCalledWith(CELL / 2, CELL / 2, 2);
    expect(graphics.fillCircle).toHaveBeenCalledWith(CELL, CELL / 2, 2);
    expect(graphics.fillStyle).toHaveBeenCalledWith(SMALL_COLOR, 1);
  });

  it('draws large routes as a band filling each covered cell once, spine through footprint centres', () => {
    const { graphics, state } = setup();

    renderRoutePreview(state, VISIBLE, CONFIG);

    // Two overlapping 2x2 footprints cover a 3x2 block.
    expect(graphics.fillRect).toHaveBeenCalledTimes(6);
    expect(graphics.fillStyle).toHaveBeenCalledWith(LARGE_COLOR, 0.2);
    expect(graphics.moveTo).toHaveBeenCalledWith(CELL, 3 * CELL);
    expect(graphics.lineTo).toHaveBeenCalledWith(2 * CELL, 3 * CELL);
  });

  it('skips redrawing an unchanged frame', () => {
    const { graphics, state } = setup();

    expect(renderRoutePreview(state, VISIBLE, CONFIG)).toBe(true);
    expect(renderRoutePreview(state, { ...VISIBLE }, CONFIG)).toBe(false);
    expect(graphics.clear).toHaveBeenCalledTimes(1);
  });

  it('clears the overlay when hidden', () => {
    const { graphics, state } = setup();

    renderRoutePreview(state, VISIBLE, CONFIG);
    renderRoutePreview(state, HIDDEN_ROUTE_PREVIEW, CONFIG);

    expect(graphics.clear).toHaveBeenCalledTimes(2);
    expect(graphics.fillRect).toHaveBeenCalledTimes(6);
  });

  it('draws the air line as dashes only when the frame shows it', () => {
    const { graphics, state } = setup();

    renderRoutePreview(state, VISIBLE, CONFIG);
    expect(graphics.lineStyle).not.toHaveBeenCalledWith(1, AIR_COLOR, 0.4);

    expect(renderRoutePreview(state, { ...VISIBLE, showsAirRoute: true }, CONFIG)).toBe(true);
    expect(graphics.lineStyle).toHaveBeenCalledWith(1, AIR_COLOR, 0.4);
    // (0,4) to (2,4) is two cells long: one dash, one gap, then the second dash.
    expect(graphics.moveTo).toHaveBeenCalledWith(CELL / 2, 4.5 * CELL);
    expect(graphics.lineTo).toHaveBeenCalledWith(1.5 * CELL, 4.5 * CELL);
    expect(graphics.moveTo).not.toHaveBeenCalledWith(2.5 * CELL, 4.5 * CELL);
  });

  it('draws the projection in full over faded current routes', () => {
    const { graphics, state } = setup();
    const projected: WaveRoutes = { small: ROUTES.small, large: [{ x: 4, y: 4 }], air: [] };

    renderRoutePreview(
      state,
      { isVisible: true, current: ROUTES, projected, showsAirRoute: false },
      CONFIG,
    );

    expect(graphics.fillStyle).toHaveBeenCalledWith(SMALL_COLOR, 0.5);
    expect(graphics.lineStyle).toHaveBeenCalledWith(2, LARGE_COLOR, 0.4);
    // Only the projected large route gets a band: one 2x2 footprint.
    expect(graphics.fillRect).toHaveBeenCalledTimes(4);
  });
});
