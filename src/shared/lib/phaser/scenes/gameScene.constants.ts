import { createInitialPlayerResources } from '../../../../entities/player-resources';
import { buildableTowers } from '../../../../entities/tower';
import { ECONOMY_BALANCE } from '../../../constants/economy';
import { GRID_DEFAULT_ROW_CENTER, GRID_DIMENSIONS } from '../../../constants/grid';

export const ENTRANCE_CELL = { x: 0, y: GRID_DEFAULT_ROW_CENTER };
export const EXIT_CELL = { x: GRID_DIMENSIONS.cols - 1, y: GRID_DEFAULT_ROW_CENTER };
export const DEFAULT_MAP_SEED = 1337;
export const DEFAULT_TOWER_COST = 50;
export const SELL_REFUND_RATIO = ECONOMY_BALANCE.towerSellRatio;
export const CREEP_BASE_MOVE_SPEED_PX_PER_SEC = 80;
export const CREEP_MAX_SIMULATION_DELTA_MS = 34;
export const INITIAL_PLAYER_RESOURCES = createInitialPlayerResources();
export const EARLY_WAVE_START_BONUS_PLACEHOLDER_ELIGIBLE = false;
export const AUTO_WAVE_START_DELAY_MS = 30000;
export const RESTART_DELAY_MS = 1200;
export const ACTION_COOLDOWN_MS = 160;
export const TOUCH_TAP_MIN_DURATION_MS = 70;
export const TOUCH_TAP_MAX_DURATION_MS = 250;
export const TOUCH_TAP_MAX_MOVE_PX = 12;
export const TOUCH_LONG_PRESS_MIN_DURATION_MS = 450;
export const DEV_FPS_REPORT_INTERVAL_MS = 500;
export const PREVIEW_VALID_FILL = 0x3ecf78;
export const PREVIEW_VALID_STROKE = 0xaaf5c8;
export const PREVIEW_INVALID_FILL = 0xe55a4f;
export const PREVIEW_INVALID_STROKE = 0xffb8b2;
export const GRID_PIXEL_WIDTH = GRID_DIMENSIONS.cols * GRID_DIMENSIONS.cellSize;
export const GRID_PIXEL_HEIGHT = GRID_DIMENSIONS.rows * GRID_DIMENSIONS.cellSize;
export const CREEP_BASE_COLOR = 0xffffff;
export const CREEP_HIT_FLASH_COLOR = 0xffffff;
export const CREEP_HIT_FLASH_DURATION_MS = 90;
export const CREEP_DEATH_FADE_DURATION_MS = 180;
export const PROJECTILE_MIN_LIFETIME_MS = 200;
export const PROJECTILE_MAX_LIFETIME_MS = 350;
export const PROJECTILE_DISPLAY_SIZE_PX = 24;
export const PROJECTILE_RENDER_DEPTH = 70;
export const IMPACT_EFFECT_LIFETIME_MS = 120;
export const IMPACT_EFFECT_RENDER_DEPTH = 72;
export const ARCHER_PROJECTILE_VISUAL_MODE: 'projectile' | 'attackEffect' = 'attackEffect';
export const DAMAGE_NUMBERS_ENABLED = true;
export const DAMAGE_NUMBER_LIFETIME_MS = 420;
export const DAMAGE_NUMBER_RISE_PX = 12;
export const DAMAGE_NUMBER_HIT_COLOR = '#ffe9a8';
/** Damage over time reads cooler and dimmer than a tower hit. */
export const DAMAGE_NUMBER_EFFECT_COLOR = '#9de8a4';
/**
 * Effects advance by at most one clamped step per frame, so a long pause or a
 * background tab cannot burst a wave down with backlogged ticks.
 */
export const EFFECT_MAX_SIMULATION_DELTA_MS = CREEP_MAX_SIMULATION_DELTA_MS;
export const WAVE_SPAWN_INTERVAL_MS = 350;
export const WAVE_FIRST_SPAWN_DELAY_MS = 200;
export const BONE_ARCHER_TOWER_ID = 'undead_bone_archer_tower';
export const PLAGUE_TOWER_ID = 'undead_plague_tower';
export const BONE_ARCHER_TOWER_CONFIG =
  buildableTowers.find((tower) => tower.id === BONE_ARCHER_TOWER_ID) ?? null;
export const PLAGUE_TOWER_CONFIG =
  buildableTowers.find((tower) => tower.id === PLAGUE_TOWER_ID) ?? null;
export const TOWER_VISUAL_SCALE_IN_CELLS = 1.3;
export const BONE_ARCHER_ORIGIN_X = 0.5;
export const BONE_ARCHER_ORIGIN_Y = 0.82;
export const PLAGUE_TOWER_ORIGIN_X = 0.5;
export const PLAGUE_TOWER_ORIGIN_Y = 0.75;
export const GRID_LINE_COLOR = 0x5f6f8f;
export const GRID_IDLE_ALPHA = 0.08;
export const GRID_BUILD_ALPHA = 0.42;
export const GRID_LINE_WIDTH = 1;
export const ENTRANCE_EXIT_LABEL_FONT_FAMILY = 'Arial';
export const ENTRANCE_EXIT_LABEL_FONT_SIZE_PX = '10px';
export const ENTRANCE_EXIT_LABEL_COLOR = '#ffffff';
export const TERRAIN_RENDER_DEPTH = -20;
export const GRID_OVERLAY_RENDER_DEPTH = 10;
export const ENTRANCE_EXIT_LABEL_RENDER_DEPTH = 20;
export const ENDPOINT_ENTRANCE_MARKER_COLOR = 0x2ecc71;
export const ENDPOINT_EXIT_MARKER_COLOR = 0xe74c3c;
export const ENDPOINT_MARKER_FILL_ALPHA = 0.22;
export const ENDPOINT_MARKER_LINE_WIDTH = 2;
export const TOWER_RENDER_DEPTH = 40;
export const CREEP_RENDER_DEPTH = 45;
export const CREEP_VISUAL_SIZE_PX = 28;
export const TERRAIN_BASE_TILE_ALPHA = 0.72;
export const TERRAIN_DECORATION_TILE_ALPHA = 0.62;
export const TERRAIN_BASE_TILE_TINT = 0xc3cbbf;
export const TERRAIN_DECORATION_TILE_TINT = 0xb7bfae;
export const BUILD_PREVIEW_RENDER_DEPTH = 15;
