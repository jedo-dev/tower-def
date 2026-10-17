import type Phaser from 'phaser';
import type { BuilderFaction } from '../../../../entities/builder-faction';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import {
  builderFactionToTerrainFaction,
  getPropForCell,
  TILES,
} from '../assets/terrainAssetRegistry';
import type { GridCell, GridModel } from '../../../../shared/types/grid';
import {
  drawGridOccupancyOverlay,
  type GridOccupancyOverlayConfig,
  type GridOccupancyOverlayState,
} from './gridOccupancyOverlay';
import type { PathRibbonState } from './pathRibbonRenderer';

export type GridRendererConfig = GridOccupancyOverlayConfig & {
  terrainRenderDepth: number;
  terrainBaseTileAlpha: number;
  terrainDecorationTileAlpha: number;
  terrainBaseTileTint: number;
  terrainDecorationTileTint: number;
  gridLineWidth: number;
  gridLineColor: number;
  gridMinorLineAlpha: number;
  gridMajorLineAlpha: number;
  /** Lines on multiples of this many cells are drawn brighter (the tower lattice). */
  gridMajorLineEveryCells: number;
  entranceExitLabelFontFamily: string;
  entranceExitLabelFontSizePx: string;
  entranceExitLabelColor: string;
  entranceExitLabelRenderDepth: number;
  entranceMarkerColor: number;
  exitMarkerColor: number;
  endpointMarkerFillAlpha: number;
  endpointMarkerLineWidth: number;
};

export type GridRendererState = GridOccupancyOverlayState & {
  gridGraphics: Phaser.GameObjects.Graphics | null;
  terrainSprites: Phaser.GameObjects.Image[];
  gridLabels: Phaser.GameObjects.Text[];
  endpointMarkers: Phaser.GameObjects.Graphics[];
  /** The shown route's worn trail, above the ground tiles. */
  pathRibbon: PathRibbonState;
};

export type GridRendererDeps = {
  scene: Phaser.Scene;
  selectedBuilderFactionId: BuilderFaction;
  pathCellKeys: ReadonlySet<string>;
  mapSeed: number;
  createGridModel: () => GridModel;
};

export function clearTerrainSprites(state: GridRendererState): void {
  state.terrainSprites.forEach((sprite) => sprite.destroy());
  state.terrainSprites = [];
}

export function clearGridLabels(state: GridRendererState): void {
  state.gridLabels.forEach((label) => label.destroy());
  state.gridLabels = [];
  state.endpointMarkers.forEach((marker) => marker.destroy());
  state.endpointMarkers = [];
}

/** Cells under (or brushed by) the trail: ground tile, but no prop. */
function isPathCell(cell: GridCell, deps: GridRendererDeps): boolean {
  return deps.pathCellKeys.has(`${cell.x}:${cell.y}`);
}

/** Texture key of a race's seamless path tile, which the trail is filled with. */
export function resolvePathTextureKey(builderFactionId: BuilderFaction): string {
  const faction = builderFactionToTerrainFaction(builderFactionId);
  return `terrain:${faction}:${TILES[faction].path}`;
}

function renderFallbackTerrainCell(state: GridRendererState, cell: GridCell): void {
  if (!state.gridGraphics) {
    return;
  }

  const x = cell.x * GRID_DIMENSIONS.cellSize;
  const y = cell.y * GRID_DIMENSIONS.cellSize;
  const fillColor =
    cell.role === 'entrance' ? 0x1e8f48 : cell.role === 'exit' ? 0xaf4536 : 0x253248;

  state.gridGraphics.fillStyle(fillColor, 1);
  state.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
}

export function drawGridCell(
  state: GridRendererState,
  deps: GridRendererDeps,
  config: GridRendererConfig,
  cell: GridCell,
): void {
  state.terrainSprites = state.terrainSprites.filter((sprite) => {
    const sameCell = sprite.getData('cellX') === cell.x && sprite.getData('cellY') === cell.y;
    if (sameCell) {
      sprite.destroy();
      return false;
    }
    return true;
  });

  const x = cell.x * GRID_DIMENSIONS.cellSize;
  const y = cell.y * GRID_DIMENSIONS.cellSize;
  const faction = builderFactionToTerrainFaction(deps.selectedBuilderFactionId);
  // Ground everywhere: the route is painted on top as one ribbon (pathRibbonRenderer).
  const terrainKey = `terrain:${faction}:${TILES[faction].ground}`;

  if (!deps.scene.textures.exists(terrainKey)) {
    renderFallbackTerrainCell(state, cell);
  } else {
    const sprite = deps.scene.add.image(x, y, terrainKey);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    sprite.setDepth(config.terrainRenderDepth);
    sprite.setAlpha(config.terrainBaseTileAlpha);
    sprite.setTint(config.terrainBaseTileTint);
    sprite.setData('cellX', cell.x);
    sprite.setData('cellY', cell.y);
    state.terrainSprites.push(sprite);

    if (!isPathCell(cell, deps) && !cell.isOccupied) {
      const propUrl = getPropForCell(cell.x, cell.y, faction, deps.mapSeed);
      if (propUrl) {
        const propKey = `terrain:${faction}:${propUrl}`;
        if (deps.scene.textures.exists(propKey)) {
          const propSprite = deps.scene.add.image(
            x + GRID_DIMENSIONS.cellSize / 2,
            y + GRID_DIMENSIONS.cellSize,
            propKey,
          );
          propSprite.setOrigin(0.5, 1);
          const targetWidth = GRID_DIMENSIONS.cellSize * 0.8;
          propSprite.setScale(targetWidth / propSprite.width);
          propSprite.setDepth(config.terrainRenderDepth + 1);
          propSprite.setData('cellX', cell.x);
          propSprite.setData('cellY', cell.y);
          state.terrainSprites.push(propSprite);
        }
      }
    }
  }
}

/** Board-edge-to-edge line offsets in cells, split into minor and major lines. */
export function partitionGridLineIndices(
  lineCount: number,
  majorEveryCells: number,
): { minor: number[]; major: number[] } {
  const minor: number[] = [];
  const major: number[] = [];

  for (let index = 0; index <= lineCount; index += 1) {
    (index % majorEveryCells === 0 ? major : minor).push(index);
  }

  return { minor, major };
}

function strokeGridLinePass(
  graphics: Phaser.GameObjects.Graphics,
  grid: GridModel,
  columnIndices: readonly number[],
  rowIndices: readonly number[],
): void {
  const { cellSize } = GRID_DIMENSIONS;
  const boardWidth = grid.cols * cellSize;
  const boardHeight = grid.rows * cellSize;

  graphics.beginPath();
  for (const column of columnIndices) {
    graphics.moveTo(column * cellSize, 0);
    graphics.lineTo(column * cellSize, boardHeight);
  }
  for (const row of rowIndices) {
    graphics.moveTo(0, row * cellSize);
    graphics.lineTo(boardWidth, row * cellSize);
  }
  graphics.strokePath();
}

function drawGridLines(
  state: GridRendererState,
  config: GridRendererConfig,
  grid: GridModel,
): void {
  if (!state.gridGraphics) {
    return;
  }

  const columns = partitionGridLineIndices(grid.cols, config.gridMajorLineEveryCells);
  const rows = partitionGridLineIndices(grid.rows, config.gridMajorLineEveryCells);

  state.gridGraphics.lineStyle(
    config.gridLineWidth,
    config.gridLineColor,
    config.gridMinorLineAlpha,
  );
  strokeGridLinePass(state.gridGraphics, grid, columns.minor, rows.minor);
  state.gridGraphics.lineStyle(
    config.gridLineWidth,
    config.gridLineColor,
    config.gridMajorLineAlpha,
  );
  strokeGridLinePass(state.gridGraphics, grid, columns.major, rows.major);
}

function drawEndpointZone(
  state: GridRendererState,
  deps: GridRendererDeps,
  config: GridRendererConfig,
  grid: GridModel,
  role: 'entrance' | 'exit',
): void {
  const anchor = role === 'entrance' ? grid.entrance : grid.exit;
  const { cellSize } = GRID_DIMENSIONS;
  const x = anchor.x * cellSize;
  const y = anchor.y * cellSize;
  const width = grid.endpointZoneFootprint.width * cellSize;
  const height = grid.endpointZoneFootprint.height * cellSize;

  // Markers live on their own layer: the shared grid overlay is dimmed to
  // gridIdleAlpha during waves, which would fade them out exactly when the
  // player needs to read the lane.
  const markerColor = role === 'entrance' ? config.entranceMarkerColor : config.exitMarkerColor;
  const marker = deps.scene.add.graphics();
  marker.setDepth(config.entranceExitLabelRenderDepth - 1);
  marker.fillStyle(markerColor, config.endpointMarkerFillAlpha);
  marker.fillRect(x + 1, y + 1, width - 2, height - 2);
  marker.lineStyle(config.endpointMarkerLineWidth, markerColor, 1);
  marker.strokeRect(x + 1, y + 1, width - 2, height - 2);
  state.endpointMarkers.push(marker);

  const label = deps.scene.add
    .text(x + width / 2, y + height / 2, role === 'entrance' ? 'IN' : 'OUT', {
      fontFamily: config.entranceExitLabelFontFamily,
      fontSize: config.entranceExitLabelFontSizePx,
      color: config.entranceExitLabelColor,
    })
    .setOrigin(0.5);
  label.setDepth(config.entranceExitLabelRenderDepth);
  state.gridLabels.push(label);
}

export function drawGrid(
  state: GridRendererState,
  deps: GridRendererDeps,
  config: GridRendererConfig,
  gridOverlayRenderDepth: number,
): GridModel {
  state.gridGraphics ??= deps.scene.add.graphics();
  state.gridGraphics.clear();
  state.gridGraphics.setDepth(gridOverlayRenderDepth);
  clearTerrainSprites(state);
  clearGridLabels(state);

  const grid = deps.createGridModel();

  for (const cell of grid.cells) {
    drawGridCell(state, deps, config, cell);
  }

  drawEndpointZone(state, deps, config, grid, 'entrance');
  drawEndpointZone(state, deps, config, grid, 'exit');

  drawGridLines(state, config, grid);
  drawGridOccupancyOverlay(state, deps.scene, config, grid.cells, gridOverlayRenderDepth);
  return grid;
}
