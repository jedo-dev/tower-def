import type { CombatRuntimeConfig } from '../runtime/combat/gameSceneCombatRuntime';
import type { GridPreviewConfig } from '../runtime/grid/gameSceneGridPreviewRuntime';
import type { GridRendererConfig } from '../runtime/grid/gameSceneGridRenderer';
import type { InputControllerConfig } from '../runtime/input/gameSceneInputController';
import type { MovementRuntimeConfig } from '../runtime/movement/gameSceneMovementRuntime';
import type { WaveRuntimeConfig } from '../runtime/wave/gameSceneWaveRuntime';
import {
  ACTION_COOLDOWN_MS,
  ARCHER_PROJECTILE_VISUAL_MODE,
  AUTO_WAVE_START_DELAY_MS,
  CREEP_BASE_COLOR,
  CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
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
  ENTRANCE_EXIT_LABEL_COLOR,
  ENTRANCE_EXIT_LABEL_FONT_FAMILY,
  ENTRANCE_EXIT_LABEL_FONT_SIZE_PX,
  ENDPOINT_ENTRANCE_MARKER_COLOR,
  ENDPOINT_EXIT_MARKER_COLOR,
  ENDPOINT_MARKER_FILL_ALPHA,
  ENDPOINT_MARKER_LINE_WIDTH,
  ENTRANCE_EXIT_LABEL_RENDER_DEPTH,
  GRID_BUILD_ALPHA,
  GRID_IDLE_ALPHA,
  GRID_LINE_COLOR,
  GRID_LINE_WIDTH,
  IMPACT_EFFECT_LIFETIME_MS,
  IMPACT_EFFECT_RENDER_DEPTH,
  PREVIEW_INVALID_FILL,
  PREVIEW_INVALID_STROKE,
  PREVIEW_VALID_FILL,
  PREVIEW_VALID_STROKE,
  PROJECTILE_DISPLAY_SIZE_PX,
  PROJECTILE_MAX_LIFETIME_MS,
  PROJECTILE_MIN_LIFETIME_MS,
  PROJECTILE_RENDER_DEPTH,
  RESTART_DELAY_MS,
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
};

export const GRID_PREVIEW_CONFIG: GridPreviewConfig = {
  previewValidFill: PREVIEW_VALID_FILL,
  previewValidStroke: PREVIEW_VALID_STROKE,
  previewInvalidFill: PREVIEW_INVALID_FILL,
  previewInvalidStroke: PREVIEW_INVALID_STROKE,
  gridBuildAlpha: GRID_BUILD_ALPHA,
  gridIdleAlpha: GRID_IDLE_ALPHA,
};

export const GRID_RENDERER_CONFIG: GridRendererConfig = {
  terrainRenderDepth: TERRAIN_RENDER_DEPTH,
  terrainBaseTileAlpha: TERRAIN_BASE_TILE_ALPHA,
  terrainDecorationTileAlpha: TERRAIN_DECORATION_TILE_ALPHA,
  terrainBaseTileTint: TERRAIN_BASE_TILE_TINT,
  terrainDecorationTileTint: TERRAIN_DECORATION_TILE_TINT,
  gridLineWidth: GRID_LINE_WIDTH,
  gridLineColor: GRID_LINE_COLOR,
  gridBuildAlpha: GRID_BUILD_ALPHA,
  entranceExitLabelFontFamily: ENTRANCE_EXIT_LABEL_FONT_FAMILY,
  entranceExitLabelFontSizePx: ENTRANCE_EXIT_LABEL_FONT_SIZE_PX,
  entranceExitLabelColor: ENTRANCE_EXIT_LABEL_COLOR,
  entranceExitLabelRenderDepth: ENTRANCE_EXIT_LABEL_RENDER_DEPTH,
  entranceMarkerColor: ENDPOINT_ENTRANCE_MARKER_COLOR,
  exitMarkerColor: ENDPOINT_EXIT_MARKER_COLOR,
  endpointMarkerFillAlpha: ENDPOINT_MARKER_FILL_ALPHA,
  endpointMarkerLineWidth: ENDPOINT_MARKER_LINE_WIDTH,
};

export const MOVEMENT_RUNTIME_CONFIG: MovementRuntimeConfig = {
  creepMaxSimulationDeltaMs: CREEP_MAX_SIMULATION_DELTA_MS,
  creepBaseMoveSpeedPxPerSec: CREEP_BASE_MOVE_SPEED_PX_PER_SEC,
  restartDelayMs: RESTART_DELAY_MS,
};
