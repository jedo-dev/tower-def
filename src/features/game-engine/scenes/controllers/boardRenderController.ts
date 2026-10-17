import { ENDPOINT_ZONE_FOOTPRINT } from '../../../../shared/constants/footprint';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import { createGridModel } from '../../../../shared/lib/grid/createGridModel';
import type { GridCell, GridPoint } from '../../../../shared/types/grid';
import { canPerformBuildActions as canPerformBuildActionsByPhase } from '../../../wave-phase';
import {
  getBuildRoutePreviewCurrentRoutes,
  updateBuildRoutePreview,
} from '../../runtime/grid/buildRoutePreviewRuntime';
import {
  updateBuildPreview as updateBuildPreviewRuntime,
  updateGridOverlayVisualState as updateGridOverlayVisualStateRuntime,
} from '../../runtime/grid/gameSceneGridPreviewRuntime';
import {
  drawGridCell as drawGridCellRuntime,
  resolvePathTextureKey,
  type GridRendererDeps,
} from '../../runtime/grid/gameSceneGridRenderer';
import { syncEndpointGates } from '../../runtime/grid/endpointGates';
import { drawGridOccupancyOverlay } from '../../runtime/grid/gridOccupancyOverlay';
import { syncPathRibbon } from '../../runtime/grid/pathRibbonRenderer';
import {
  refreshPathTiles,
  selectPlayerPathRoute,
  toTrailCellKeys,
} from '../../runtime/grid/pathTiles';
import { ENDPOINT_GATE_RENDER_DEPTH, GRID_OVERLAY_RENDER_DEPTH } from '../gameScene.constants';
import { resolveTowerRangeCells } from '../gameScene.helpers';
import {
  GRID_PREVIEW_CONFIG,
  GRID_RENDERER_CONFIG,
  PATH_RIBBON_CONFIG,
  ROUTE_PREVIEW_CONFIG,
} from '../gameScene.runtimeConfigs';
import { isBuildAnchorValid } from './buildRuntimeAdapter';
import type { GameSceneState } from './gameSceneState';
import {
  canPerformBuildActions,
  doesFacedRosterHaveAirCreeps,
  getPreviewAnchor,
  getVisibleBuilderFactionId,
  getVisibleGridCells,
  type GameSceneCore,
} from './sceneQueries';

export function getGridRendererDeps({ scene, state }: GameSceneCore): GridRendererDeps {
  return {
    scene,
    selectedBuilderFactionId: getVisibleBuilderFactionId(state),
    pathCellKeys: state.pathCellKeys,
    mapSeed: state.mapSeed,
    createGridModel: () =>
      createGridModel({
        entrance: state.mapEndpoints.entrance,
        exit: state.mapEndpoints.exit,
      }),
  };
}

export function drawGridCell(core: GameSceneCore, cell: GridCell): void {
  drawGridCellRuntime(
    core.state.gridRendererState,
    getGridRendererDeps(core),
    GRID_RENDERER_CONFIG,
    cell,
  );
}

/** The occupancy overlay dims with the grid lines during waves. */
export function syncOccupancyOverlayAlpha(state: GameSceneState): void {
  updateGridOverlayVisualStateRuntime(
    state.gridRendererState.occupancyGraphics,
    canPerformBuildActions(state),
    GRID_PREVIEW_CONFIG,
  );
}

export function updateGridOverlayVisualState(state: GameSceneState): void {
  updateGridOverlayVisualStateRuntime(
    state.gridRendererState.gridGraphics,
    canPerformBuildActions(state),
    GRID_PREVIEW_CONFIG,
  );
  syncOccupancyOverlayAlpha(state);
}

export function redrawOccupancyOverlay({ scene, state }: GameSceneCore): void {
  if (!state.gridModel) {
    return;
  }

  drawGridOccupancyOverlay(
    state.gridRendererState,
    scene,
    GRID_RENDERER_CONFIG,
    getVisibleGridCells(state),
    GRID_OVERLAY_RENDER_DEPTH,
  );
  syncOccupancyOverlayAlpha(state);
}

export function redrawTerrainTiles(core: GameSceneCore): void {
  const { state } = core;
  if (!state.gridModel) {
    return;
  }

  for (const cell of getVisibleGridCells(state)) {
    drawGridCellRuntime(
      state.gridRendererState,
      getGridRendererDeps(core),
      GRID_RENDERER_CONFIG,
      cell,
    );
  }
  redrawOccupancyOverlay(core);
}

/**
 * Points the trail ribbon at `route` on the board in view. A no-op unless the
 * route or the visible race changed, so callers may call it freely on events.
 */
function syncShownPathRibbon({ scene, state }: GameSceneCore, route: readonly GridPoint[]): void {
  syncPathRibbon(
    state.gridRendererState.pathRibbon,
    scene,
    { route, pathTextureKey: resolvePathTextureKey(getVisibleBuilderFactionId(state)) },
    PATH_RIBBON_CONFIG,
  );
}

/**
 * Points the entrance and exit gates at the board in view: its race, and for
 * a corner gate the edge `route` passes by. A no-op unless something changed.
 */
export function syncShownEndpointGates(
  { scene, state }: GameSceneCore,
  route: readonly GridPoint[],
): void {
  syncEndpointGates(scene, state.gridRendererState.endpointGates, {
    raceId: getVisibleBuilderFactionId(state),
    entrance: state.mapEndpoints.entrance,
    exit: state.mapEndpoints.exit,
    footprint: ENDPOINT_ZONE_FOOTPRINT,
    board: GRID_DIMENSIONS,
    cellSize: GRID_DIMENSIONS.cellSize,
    route,
    depth: ENDPOINT_GATE_RENDER_DEPTH,
  });
}

/**
 * Shows `route` as the board's path: the trail ribbon follows it and every
 * terrain tile is redrawn against its trail cells (view switch, wave start).
 */
export function showPathRoute(core: GameSceneCore, route: readonly GridPoint[]): void {
  core.state.pathCellKeys = toTrailCellKeys(route);
  syncShownPathRibbon(core, route);
  syncShownEndpointGates(core, route);
  redrawTerrainTiles(core);
}

/** Shares the route preview's memoised search while building. */
export function getPlayerPathRoute(state: GameSceneState): readonly GridPoint[] {
  const grid = state.gridModel;
  return selectPlayerPathRoute(
    grid !== null &&
      !state.runState.isGameOver &&
      canPerformBuildActionsByPhase(state.runState.wavePhaseState),
    () => (grid ? getBuildRoutePreviewCurrentRoutes(state.routePreview, grid).small : []),
    state.runState.activeCreepRoutes.small,
  );
}

/**
 * Keeps the trail (ribbon and prop-free cells) on the current small route while building.
 * Shares the route preview's memoised search, so it adds no route search.
 * Outside the build phase the tiles follow the wave's routes (wave start).
 */
export function refreshBuildPhasePathTiles(core: GameSceneCore): void {
  const { state } = core;
  if (!state.arePathTilesStale || !state.gridModel || !canPerformBuildActions(state)) {
    return;
  }
  state.arePathTilesStale = false;
  const route = getPlayerPathRoute(state);
  refreshPathTiles(
    state.gridModel.cells,
    state.pathCellKeys,
    route,
    (nextPathCellKeys) => {
      state.pathCellKeys = nextPathCellKeys;
      syncShownPathRibbon(core, route);
    },
    (cell) => drawGridCell(core, cell),
  );
  syncShownEndpointGates(core, route);
}

export function updateBuildPreview(core: GameSceneCore): void {
  const { state } = core;
  const isHoveredAnchorValid = updateBuildPreviewRuntime(
    {
      overlay: state.buildPreviewOverlay,
      gridGraphics: state.gridRendererState.gridGraphics,
      gridModel: state.gridModel,
      hoveredBuildAnchor: getPreviewAnchor(state),
      canPerformBuildActions: canPerformBuildActions(state),
      selectedTowerRangeCells: resolveTowerRangeCells(state.selectedTowerType),
      isBuildAnchorValid: (anchor, grid) => isBuildAnchorValid(core, anchor, grid),
    },
    GRID_PREVIEW_CONFIG,
  );
  // The preview runtime re-dims the grid lines; keep the overlay in step.
  syncOccupancyOverlayAlpha(state);
  updateBuildRoutePreview(
    state.routePreview,
    {
      grid: state.gridModel,
      isBuildPhase: canPerformBuildActions(state),
      hoveredAnchor: getPreviewAnchor(state),
      isHoveredAnchorValid,
      hasAirCreeps: doesFacedRosterHaveAirCreeps(state),
    },
    ROUTE_PREVIEW_CONFIG,
  );
}

export function refreshBuildState(core: GameSceneCore): void {
  core.scene.registry.set('phase.build.active', canPerformBuildActions(core.state));
  updateGridOverlayVisualState(core.state);
  updateBuildPreview(core);
}
