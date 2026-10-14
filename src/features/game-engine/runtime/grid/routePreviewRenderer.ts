import type Phaser from 'phaser';
import { CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { UnitSizeClass } from '../../../../shared/types/content-ids';
import type { WaveRoute, WaveRoutes } from '../../../../shared/lib/pathfinding/waveRoutes';
import { HIDDEN_ROUTE_PREVIEW, type RoutePreviewFrame } from './buildRoutePreviewModel';

export type RoutePreviewConfig = {
  smallRouteColor: number;
  smallRouteAlpha: number;
  smallRouteDotRadiusPx: number;
  /** Dots per route step; 2 puts one on every cell centre and one between. */
  smallRouteDotsPerStep: number;
  largeRouteColor: number;
  largeRouteBandAlpha: number;
  largeRouteSpineWidthPx: number;
  largeRouteSpineAlpha: number;
  /** Alpha factor for today's routes while a placement's routes are shown over them. */
  ghostAlphaFactor: number;
};

export type RoutePreviewRenderState = {
  graphics: Phaser.GameObjects.Graphics | null;
  drawn: RoutePreviewFrame;
};

const LARGE_FOOTPRINT_SIZE = CREEP_FOOTPRINT_SIZE_BY_SIZE_CLASS[UnitSizeClass.LARGE];

export function createRoutePreviewRenderState(): RoutePreviewRenderState {
  return { graphics: null, drawn: HIDDEN_ROUTE_PREVIEW };
}

function cellCenterPx(cell: number): number {
  return cell * GRID_DIMENSIONS.cellSize + GRID_DIMENSIONS.cellSize / 2;
}

/** Centre of a large creep's footprint anchored at `cell`, in pixels. */
function largeFootprintCenterPx(cell: number): number {
  return cell * GRID_DIMENSIONS.cellSize + (LARGE_FOOTPRINT_SIZE * GRID_DIMENSIONS.cellSize) / 2;
}

/** Single-cell route: a dotted line through cell centres. */
function drawSmallRoute(
  graphics: Phaser.GameObjects.Graphics,
  route: WaveRoute,
  config: RoutePreviewConfig,
  alpha: number,
): void {
  if (route.length === 0) {
    return;
  }
  graphics.fillStyle(config.smallRouteColor, alpha);
  for (let index = 0; index + 1 < route.length; index += 1) {
    const fromX = cellCenterPx(route[index].x);
    const fromY = cellCenterPx(route[index].y);
    const toX = cellCenterPx(route[index + 1].x);
    const toY = cellCenterPx(route[index + 1].y);
    for (let dot = 0; dot < config.smallRouteDotsPerStep; dot += 1) {
      const t = dot / config.smallRouteDotsPerStep;
      graphics.fillCircle(
        fromX + (toX - fromX) * t,
        fromY + (toY - fromY) * t,
        config.smallRouteDotRadiusPx,
      );
    }
  }
  const last = route[route.length - 1];
  graphics.fillCircle(cellCenterPx(last.x), cellCenterPx(last.y), config.smallRouteDotRadiusPx);
}

/**
 * Cells a large creep's footprint covers along `route`, each filled once so the
 * translucent band has an even tone (overlapping strokes would darken turns).
 */
function drawLargeRouteBand(
  graphics: Phaser.GameObjects.Graphics,
  route: WaveRoute,
  config: RoutePreviewConfig,
  alpha: number,
): void {
  const { cols, rows, cellSize } = GRID_DIMENSIONS;
  const covered = new Uint8Array(cols * rows);
  graphics.fillStyle(config.largeRouteColor, alpha);
  for (const anchor of route) {
    for (let dy = 0; dy < LARGE_FOOTPRINT_SIZE; dy += 1) {
      for (let dx = 0; dx < LARGE_FOOTPRINT_SIZE; dx += 1) {
        const x = anchor.x + dx;
        const y = anchor.y + dy;
        const index = y * cols + x;
        if (x >= cols || y >= rows || covered[index] === 1) {
          continue;
        }
        covered[index] = 1;
        graphics.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

/** Thin line through the large creep's footprint centres, showing the walking line. */
function drawLargeRouteSpine(
  graphics: Phaser.GameObjects.Graphics,
  route: WaveRoute,
  config: RoutePreviewConfig,
  alpha: number,
): void {
  if (route.length < 2) {
    return;
  }
  graphics.lineStyle(config.largeRouteSpineWidthPx, config.largeRouteColor, alpha);
  graphics.beginPath();
  graphics.moveTo(largeFootprintCenterPx(route[0].x), largeFootprintCenterPx(route[0].y));
  for (let index = 1; index < route.length; index += 1) {
    graphics.lineTo(largeFootprintCenterPx(route[index].x), largeFootprintCenterPx(route[index].y));
  }
  graphics.strokePath();
}

function drawRoutesInFull(
  graphics: Phaser.GameObjects.Graphics,
  routes: WaveRoutes,
  config: RoutePreviewConfig,
): void {
  drawLargeRouteBand(graphics, routes.large, config, config.largeRouteBandAlpha);
  drawLargeRouteSpine(graphics, routes.large, config, config.largeRouteSpineAlpha);
  drawSmallRoute(graphics, routes.small, config, config.smallRouteAlpha);
}

/** Today's routes behind a projection: lines only, faded, so the change stands out. */
function drawRoutesAsGhost(
  graphics: Phaser.GameObjects.Graphics,
  routes: WaveRoutes,
  config: RoutePreviewConfig,
): void {
  const factor = config.ghostAlphaFactor;
  drawLargeRouteSpine(graphics, routes.large, config, config.largeRouteSpineAlpha * factor);
  drawSmallRoute(graphics, routes.small, config, config.smallRouteAlpha * factor);
}

function isSameFrame(left: RoutePreviewFrame, right: RoutePreviewFrame): boolean {
  return (
    left.isVisible === right.isVisible &&
    left.current === right.current &&
    left.projected === right.projected
  );
}

/**
 * Draws the small and large routes, and the routes a hovered placement would
 * produce. Redraws only when the frame changed; returns whether it did.
 */
export function renderRoutePreview(
  state: RoutePreviewRenderState,
  frame: RoutePreviewFrame,
  config: RoutePreviewConfig,
): boolean {
  const graphics = state.graphics;
  if (!graphics || isSameFrame(state.drawn, frame)) {
    return false;
  }

  state.drawn = frame;
  graphics.clear();
  if (!frame.isVisible || !frame.current) {
    return true;
  }

  if (frame.projected) {
    drawRoutesAsGhost(graphics, frame.current, config);
    drawRoutesInFull(graphics, frame.projected, config);
  } else {
    drawRoutesInFull(graphics, frame.current, config);
  }
  return true;
}
