import type { CombatRuntimeConfig } from '../runtime/combat/gameSceneCombatRuntime';
import type { GridPreviewConfig } from '../runtime/grid/gameSceneGridPreviewRuntime';
import type { GridRendererConfig } from '../runtime/grid/gameSceneGridRenderer';
import type { PathRibbonConfig } from '../runtime/grid/pathRibbonRenderer';
import type { RoutePreviewConfig } from '../runtime/grid/routePreviewRenderer';
import { GRID_DIMENSIONS } from '../../../shared/constants/grid';
import { PATH_RIBBON_STYLE } from '../../../shared/constants/terrain';
import type { InputControllerConfig } from '../runtime/input/gameSceneInputController';
import type { MovementRuntimeConfig } from '../runtime/movement/gameSceneMovementRuntime';
import type { WaveRuntimeConfig } from '../runtime/wave/gameSceneWaveRuntime';
import {
  ACTION_COOLDOWN_MS,
  BOARD_WHEEL_ZOOM_SENSITIVITY,
  DOUBLE_TAP_MAX_INTERVAL_MS,
  DOUBLE_TAP_MAX_MOVE_PX,
  POINTER_PAN_START_THRESHOLD_PX,
  ROUTE_PREVIEW_AIR_ALPHA,
  ROUTE_PREVIEW_AIR_COLOR,
  ROUTE_PREVIEW_AIR_DASH_PX,
  ROUTE_PREVIEW_AIR_GAP_PX,
  ROUTE_PREVIEW_AIR_WIDTH_PX,
  ROUTE_PREVIEW_GHOST_ALPHA_FACTOR,
  ROUTE_PREVIEW_LARGE_BAND_ALPHA,
  ROUTE_PREVIEW_LARGE_COLOR,
  ROUTE_PREVIEW_LARGE_SPINE_ALPHA,
  ROUTE_PREVIEW_LARGE_SPINE_WIDTH_PX,
  ROUTE_PREVIEW_SMALL_ALPHA,
  ROUTE_PREVIEW_SMALL_COLOR,
  ROUTE_PREVIEW_SMALL_DOT_RADIUS_PX,
  ROUTE_PREVIEW_SMALL_DOTS_PER_STEP,
  ARCHER_PROJECTILE_VISUAL_MODE,
  AUTO_WAVE_START_DELAY_MS,
  CREEP_BASE_COLOR,
  CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
  CREEP_DEATH_ANIMATION_DURATION_MS,
  CREEP_DEATH_FADE_DURATION_MS,
  CREEP_HIT_FLASH_COLOR,
  CREEP_HIT_FLASH_DURATION_MS,
  CREEP_MAX_SIMULATION_DELTA_MS,
  DAMAGE_NUMBER_EFFECT_COLOR,
  DAMAGE_NUMBER_HIT_COLOR,
  DAMAGE_NUMBER_LIFETIME_MS,
  DAMAGE_NUMBER_RISE_PX,
  DAMAGE_NUMBERS_ENABLED,
  EFFECT_MAX_SIMULATION_DELTA_MS,
  EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE,
  OCCUPIED_CELL_FILL_ALPHA,
  OCCUPIED_CELL_FILL_COLOR,
  GRID_BUILD_ALPHA,
  GRID_IDLE_ALPHA,
  GRID_LINE_COLOR,
  GRID_LINE_WIDTH,
  GRID_MAJOR_LINE_ALPHA,
  GRID_MAJOR_LINE_EVERY_CELLS,
  GRID_MINOR_LINE_ALPHA,
  IMPACT_EFFECT_LIFETIME_MS,
  GRID_PIXEL_HEIGHT,
  GRID_PIXEL_WIDTH,
  IMPACT_EFFECT_RENDER_DEPTH,
  PATH_RIBBON_RENDER_DEPTH,
  PREVIEW_INVALID_FILL,
  PREVIEW_INVALID_STROKE,
  PREVIEW_VALID_FILL,
  PREVIEW_VALID_STROKE,
  PROJECTILE_DISPLAY_SIZE_PX,
  PROJECTILE_MAX_LIFETIME_MS,
  PROJECTILE_MIN_LIFETIME_MS,
  PROJECTILE_RENDER_DEPTH,
  TERRAIN_BASE_TILE_ALPHA,
  TERRAIN_BASE_TILE_TINT,
  TERRAIN_DECORATION_TILE_ALPHA,
  TERRAIN_DECORATION_TILE_TINT,
  TERRAIN_RENDER_DEPTH,
  TOUCH_LONG_PRESS_MIN_DURATION_MS,
  TOUCH_TAP_MAX_DURATION_MS,
  TOUCH_TAP_MAX_MOVE_PX,
  TOUCH_TAP_MIN_DURATION_MS,
  WAVE_FIRST_SPAWN_DELAY_MS,
  WAVE_SPAWN_INTERVAL_MS,
} from './gameScene.constants';

export const COMBAT_RUNTIME_CONFIG: CombatRuntimeConfig = {
  archerProjectileVisualMode: ARCHER_PROJECTILE_VISUAL_MODE,
  creepBaseColor: CREEP_BASE_COLOR,
  creepHitFlashColor: CREEP_HIT_FLASH_COLOR,
  creepHitFlashDurationMs: CREEP_HIT_FLASH_DURATION_MS,
  creepDeathFadeDurationMs: CREEP_DEATH_FADE_DURATION_MS,
  creepDeathAnimationDurationMs: CREEP_DEATH_ANIMATION_DURATION_MS,
  projectileMinLifetimeMs: PROJECTILE_MIN_LIFETIME_MS,
  projectileMaxLifetimeMs: PROJECTILE_MAX_LIFETIME_MS,
  projectileDisplaySizePx: PROJECTILE_DISPLAY_SIZE_PX,
  projectileRenderDepth: PROJECTILE_RENDER_DEPTH,
  impactEffectLifetimeMs: IMPACT_EFFECT_LIFETIME_MS,
  impactEffectRenderDepth: IMPACT_EFFECT_RENDER_DEPTH,
  damageNumbersEnabled: DAMAGE_NUMBERS_ENABLED,
  damageNumberLifetimeMs: DAMAGE_NUMBER_LIFETIME_MS,
  damageNumberRisePx: DAMAGE_NUMBER_RISE_PX,
  damageNumberHitColor: DAMAGE_NUMBER_HIT_COLOR,
  damageNumberEffectColor: DAMAGE_NUMBER_EFFECT_COLOR,
  effectMaxSimulationDeltaMs: EFFECT_MAX_SIMULATION_DELTA_MS,
};

export const WAVE_RUNTIME_CONFIG: WaveRuntimeConfig = {
  autoWaveStartDelayMs: AUTO_WAVE_START_DELAY_MS,
  waveSpawnIntervalMs: WAVE_SPAWN_INTERVAL_MS,
  waveFirstSpawnDelayMs: WAVE_FIRST_SPAWN_DELAY_MS,
  earlyWaveStartBonusPlaceholderEligible: EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE,
};

export const INPUT_CONTROLLER_CONFIG: InputControllerConfig = {
  actionCooldownMs: ACTION_COOLDOWN_MS,
  touchTapMinDurationMs: TOUCH_TAP_MIN_DURATION_MS,
  touchTapMaxDurationMs: TOUCH_TAP_MAX_DURATION_MS,
  touchTapMaxMovePx: TOUCH_TAP_MAX_MOVE_PX,
  touchLongPressMinDurationMs: TOUCH_LONG_PRESS_MIN_DURATION_MS,
  panStartThresholdPx: POINTER_PAN_START_THRESHOLD_PX,
  doubleTapMaxIntervalMs: DOUBLE_TAP_MAX_INTERVAL_MS,
  doubleTapMaxMovePx: DOUBLE_TAP_MAX_MOVE_PX,
  wheelZoomSensitivity: BOARD_WHEEL_ZOOM_SENSITIVITY,
};

export const GRID_PREVIEW_CONFIG: GridPreviewConfig = {
  previewValidFill: PREVIEW_VALID_FILL,
  previewValidStroke: PREVIEW_VALID_STROKE,
  previewInvalidFill: PREVIEW_INVALID_FILL,
  previewInvalidStroke: PREVIEW_INVALID_STROKE,
  gridBuildAlpha: GRID_BUILD_ALPHA,
  gridIdleAlpha: GRID_IDLE_ALPHA,
};

export const ROUTE_PREVIEW_CONFIG: RoutePreviewConfig = {
  smallRouteColor: ROUTE_PREVIEW_SMALL_COLOR,
  smallRouteAlpha: ROUTE_PREVIEW_SMALL_ALPHA,
  smallRouteDotRadiusPx: ROUTE_PREVIEW_SMALL_DOT_RADIUS_PX,
  smallRouteDotsPerStep: ROUTE_PREVIEW_SMALL_DOTS_PER_STEP,
  largeRouteColor: ROUTE_PREVIEW_LARGE_COLOR,
  largeRouteBandAlpha: ROUTE_PREVIEW_LARGE_BAND_ALPHA,
  largeRouteSpineWidthPx: ROUTE_PREVIEW_LARGE_SPINE_WIDTH_PX,
  largeRouteSpineAlpha: ROUTE_PREVIEW_LARGE_SPINE_ALPHA,
  ghostAlphaFactor: ROUTE_PREVIEW_GHOST_ALPHA_FACTOR,
  airRouteColor: ROUTE_PREVIEW_AIR_COLOR,
  airRouteAlpha: ROUTE_PREVIEW_AIR_ALPHA,
  airRouteWidthPx: ROUTE_PREVIEW_AIR_WIDTH_PX,
  airRouteDashPx: ROUTE_PREVIEW_AIR_DASH_PX,
  airRouteGapPx: ROUTE_PREVIEW_AIR_GAP_PX,
};

export const GRID_RENDERER_CONFIG: GridRendererConfig = {
  terrainRenderDepth: TERRAIN_RENDER_DEPTH,
  terrainBaseTileAlpha: TERRAIN_BASE_TILE_ALPHA,
  terrainDecorationTileAlpha: TERRAIN_DECORATION_TILE_ALPHA,
  terrainBaseTileTint: TERRAIN_BASE_TILE_TINT,
  terrainDecorationTileTint: TERRAIN_DECORATION_TILE_TINT,
  gridLineWidth: GRID_LINE_WIDTH,
  gridLineColor: GRID_LINE_COLOR,
  gridMinorLineAlpha: GRID_MINOR_LINE_ALPHA,
  gridMajorLineAlpha: GRID_MAJOR_LINE_ALPHA,
  gridMajorLineEveryCells: GRID_MAJOR_LINE_EVERY_CELLS,
  occupiedCellFillColor: OCCUPIED_CELL_FILL_COLOR,
  occupiedCellFillAlpha: OCCUPIED_CELL_FILL_ALPHA,
};

export const PATH_RIBBON_CONFIG: PathRibbonConfig = {
  ...PATH_RIBBON_STYLE,
  cellSize: GRID_DIMENSIONS.cellSize,
  boardWidth: GRID_PIXEL_WIDTH,
  boardHeight: GRID_PIXEL_HEIGHT,
  renderDepth: PATH_RIBBON_RENDER_DEPTH,
  // The trail keeps the look the per-cell path tiles had.
  alpha: TERRAIN_BASE_TILE_ALPHA,
  tint: TERRAIN_BASE_TILE_TINT,
};

export const MOVEMENT_RUNTIME_CONFIG: MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: CREEP_MAX_SIMULATION_DELTA_MS,
  creepBaseMoveSpeedPxPerSec: CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
};
