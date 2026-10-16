import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import {
  GROUND_ZONE_FILL_ALPHA,
  GROUND_ZONE_FILL_COLOR,
  GROUND_ZONE_OUTLINE_ALPHA,
  GROUND_ZONE_OUTLINE_WIDTH_PX,
  GROUND_ZONE_RENDER_DEPTH,
} from '../../scenes/gameScene.constants';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import type { CombatRuntimeDependencies } from './combatRuntimeTypes';
import type { PixelPoint } from './towerCombatTypes';

/** Pixel centre of the zone being drawn; written per zone, never kept. */
const zoneCenterPx: PixelPoint = { x: 0, y: 0 };

/**
 * Draws the field's ground zones (tower-def-bge.9) as subtle circles on one
 * Graphics per field, created on the first zone. The drawing is redone while
 * zones live and wiped when none remain; a field that never had a zone does
 * nothing.
 */
export function renderGroundZones(
  battlefield: BattlefieldRenderState,
  deps: Pick<CombatRuntimeDependencies, 'scene' | 'writeCellCenter'>,
): void {
  const store = battlefield.groundZones;
  let graphics = battlefield.groundZoneGraphics;

  if (store.count === 0) {
    graphics?.clear();
    return;
  }

  if (graphics === undefined) {
    graphics = deps.scene.add.graphics();
    graphics.setDepth(GROUND_ZONE_RENDER_DEPTH);
    battlefield.groundZoneGraphics = graphics;
  }

  graphics.clear();
  graphics.fillStyle(GROUND_ZONE_FILL_COLOR, GROUND_ZONE_FILL_ALPHA);
  graphics.lineStyle(
    GROUND_ZONE_OUTLINE_WIDTH_PX,
    GROUND_ZONE_FILL_COLOR,
    GROUND_ZONE_OUTLINE_ALPHA,
  );
  for (let index = 0; index < store.count; index += 1) {
    const zone = store.zones[index];
    // Zone centres are cells in the creep footprint frame, which the cell writer maps linearly.
    deps.writeCellCenter(zone, zoneCenterPx);
    const radiusPx = zone.radiusCells * GRID_DIMENSIONS.cellSize;
    graphics.fillCircle(zoneCenterPx.x, zoneCenterPx.y, radiusPx);
    graphics.strokeCircle(zoneCenterPx.x, zoneCenterPx.y, radiusPx);
  }
}
