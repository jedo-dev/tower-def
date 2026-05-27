import type Phaser from 'phaser';
import type { BuilderFaction } from '../../../../../entities/builder-faction';
import { GRID_DIMENSIONS } from '../../../../constants/grid';
import { builderFactionToTerrainFaction, getPropForCell, TILES } from '../../../../../assets/registry';
import type { GridCell, GridModel } from '../../../../types/grid';

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
}

function isPathCell(cell: GridCell, deps: GridRendererDeps): boolean {
  return deps.pathCellKeys.has(`${cell.x}:${cell.y}`);
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
  const tile = isPathCell(cell, deps) ? TILES[faction].path : TILES[faction].ground;
  const terrainKey = `terrain:${faction}:${tile}`;

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
