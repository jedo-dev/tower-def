import type Phaser from 'phaser';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { TerrainAssetKey } from '../../../../constants/terrain';
import { isUndeadDecorationTileIndex, resolveUndeadTerrainTileIndex } from '../../terrain/undeadTerrain';
import type { GridCell, GridModel } from '../../../../types/grid';
import type { GridPosition } from '../../../../types/pathfinding';

export type GridRendererConfig = {
  terrainRenderDepth: number;
  terrainBaseTileAlpha: number;
  terrainDecorationTileAlpha: number;
  terrainBaseTileTint: number;
  terrainDecorationTileTint: number;
  gridLineWidth: number;
  gridLineColor: number;
  gridBuildAlpha: number;
  entranceExitLabelFontFamily: string;
  entranceExitLabelFontSizePx: string;
  entranceExitLabelColor: string;
  entranceExitLabelRenderDepth: number;
};

export type GridRendererState = {
  gridGraphics: Phaser.GameObjects.Graphics | null;
  terrainSprites: Phaser.GameObjects.Image[];
  gridLabels: Phaser.GameObjects.Text[];
};

export type GridRendererDeps = {
  scene: Phaser.Scene;
  selectedBuilderFactionId: string;
  undeadFactionId: string;
  entranceCell: GridPosition;
  exitCell: GridPosition;
  createGridModel: () => GridModel;
};

export function clearTerrainSprites(state: GridRendererState): void {
  state.terrainSprites.forEach((sprite) => sprite.destroy());
  state.terrainSprites = [];
}

export function clearGridLabels(state: GridRendererState): void {
  state.gridLabels.forEach((label) => label.destroy());
  state.gridLabels = [];
}

function resolveTerrainTileIndexForCell(cell: GridCell, deps: GridRendererDeps): number {
  if (deps.selectedBuilderFactionId !== deps.undeadFactionId) {
    return resolveUndeadTerrainTileIndex({
      position: { x: cell.x, y: cell.y },
      entrance: deps.entranceCell,
      exit: deps.exitCell,
      cols: GRID_DIMENSIONS.cols,
      rows: GRID_DIMENSIONS.rows,
    });
  }

  return resolveUndeadTerrainTileIndex({
    position: { x: cell.x, y: cell.y },
    entrance: deps.entranceCell,
    exit: deps.exitCell,
    cols: GRID_DIMENSIONS.cols,
    rows: GRID_DIMENSIONS.rows,
  });
}

function renderFallbackTerrainCell(
  state: GridRendererState,
  cell: GridCell,
): void {
  if (!state.gridGraphics) {
    return;
  }

  const x = cell.x * GRID_DIMENSIONS.cellSize;
  const y = cell.y * GRID_DIMENSIONS.cellSize;
  const fillColor =
    cell.role === 'entrance'
      ? 0x1e8f48
      : cell.role === 'exit'
        ? 0xaf4536
        : 0x253248;

  state.gridGraphics.fillStyle(fillColor, 1);
  state.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
}

export function drawGridCell(
  state: GridRendererState,
  deps: GridRendererDeps,
  config: GridRendererConfig,
  cell: GridCell,
): void {
  const x = cell.x * GRID_DIMENSIONS.cellSize;
  const y = cell.y * GRID_DIMENSIONS.cellSize;

  if (!deps.scene.textures.exists(TerrainAssetKey.UNDEAD_TILESET)) {
    renderFallbackTerrainCell(state, cell);
  } else {
    const tileIndex = resolveTerrainTileIndexForCell(cell, deps);
    const sprite = deps.scene.add.image(x, y, TerrainAssetKey.UNDEAD_TILESET, tileIndex);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
    sprite.setDepth(config.terrainRenderDepth);
    if (isUndeadDecorationTileIndex(tileIndex)) {
      sprite.setAlpha(config.terrainDecorationTileAlpha);
      sprite.setTint(config.terrainDecorationTileTint);
    } else {
      sprite.setAlpha(config.terrainBaseTileAlpha);
      sprite.setTint(config.terrainBaseTileTint);
    }
    state.terrainSprites.push(sprite);
  }

  if (!state.gridGraphics) {
    return;
  }

  if (cell.isOccupied) {
    state.gridGraphics.fillStyle(0x263347, 0.55);
    state.gridGraphics.fillRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
  }
}

function drawGridLines(
  state: GridRendererState,
  config: GridRendererConfig,
  grid: GridModel,
): void {
  if (!state.gridGraphics) {
    return;
  }

  state.gridGraphics.lineStyle(config.gridLineWidth, config.gridLineColor, config.gridBuildAlpha);
  for (const cell of grid.cells) {
    const x = cell.x * GRID_DIMENSIONS.cellSize;
    const y = cell.y * GRID_DIMENSIONS.cellSize;
    state.gridGraphics.strokeRect(x, y, GRID_DIMENSIONS.cellSize, GRID_DIMENSIONS.cellSize);
  }
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

    if (cell.role === 'entrance' || cell.role === 'exit') {
      const x = cell.x * GRID_DIMENSIONS.cellSize;
      const y = cell.y * GRID_DIMENSIONS.cellSize;

      const label = deps.scene
        .add
        .text(
          x + GRID_DIMENSIONS.cellSize / 2,
          y + GRID_DIMENSIONS.cellSize / 2,
          cell.role === 'entrance' ? 'IN' : 'OUT',
          {
            fontFamily: config.entranceExitLabelFontFamily,
            fontSize: config.entranceExitLabelFontSizePx,
            color: config.entranceExitLabelColor,
          },
        )
        .setOrigin(0.5);
      label.setDepth(config.entranceExitLabelRenderDepth);
      state.gridLabels.push(label);
    }
  }

  drawGridLines(state, config, grid);
  return grid;
}
