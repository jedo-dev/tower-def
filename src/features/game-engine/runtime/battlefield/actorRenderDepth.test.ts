import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { UnitMoveType } from '../../../../shared/types/content-ids';
import { CREEP_SENDER_RING_RENDER_DEPTH } from '../../scenes/creepReadability.constants';
import { AIR_CREEP_RENDER_DEPTH, PROJECTILE_RENDER_DEPTH } from '../../scenes/gameScene.constants';
import type { CreepRenderState } from '../../scenes/gameScene.types';
import {
  resolveCreepRenderDepth,
  resolveTowerRenderDepth,
  syncCreepRenderDepth,
} from './actorRenderDepth';

const CELL = 16;
/** Bottom edge of a tower anchored at row 10: rows 10 and 11, so y = 192. */
const TOWER = { x: 6, y: 10 };
const TOWER_BOTTOM_Y = 12 * CELL;

describe('resolveTowerRenderDepth', () => {
  it('increases with the row, so a lower tower draws over the base of the one above', () => {
    const upper = resolveTowerRenderDepth({ x: 6, y: 8 }, CELL);
    const lower = resolveTowerRenderDepth({ x: 6, y: 10 }, CELL);

    expect(lower).toBeGreaterThan(upper);
  });

  it('breaks ties within a row by column without crossing into the next row', () => {
    const left = resolveTowerRenderDepth({ x: 0, y: 10 }, CELL);
    const right = resolveTowerRenderDepth({ x: 18, y: 10 }, CELL);
    const nextRow = resolveTowerRenderDepth({ x: 0, y: 11 }, CELL);

    expect(right).toBeGreaterThan(left);
    expect(nextRow).toBeGreaterThan(right);
  });

  it('stays between the creep rings and the projectiles across the whole board', () => {
    const top = resolveTowerRenderDepth({ x: 0, y: 0 }, CELL);
    const bottom = resolveTowerRenderDepth({ x: 18, y: 28 }, CELL);

    expect(top).toBeGreaterThan(CREEP_SENDER_RING_RENDER_DEPTH);
    expect(bottom).toBeLessThan(AIR_CREEP_RENDER_DEPTH);
    expect(AIR_CREEP_RENDER_DEPTH).toBeLessThan(PROJECTILE_RENDER_DEPTH);
  });
});

describe('resolveCreepRenderDepth', () => {
  const towerDepth = resolveTowerRenderDepth(TOWER, CELL);

  it('draws a creep walking in front of a tower over it', () => {
    expect(resolveCreepRenderDepth(TOWER_BOTTOM_Y + 8, false, CELL)).toBeGreaterThan(towerDepth);
    expect(resolveCreepRenderDepth(TOWER_BOTTOM_Y + 0.5, false, CELL)).toBeGreaterThan(towerDepth);
  });

  it('draws a creep behind a tower under its overhang', () => {
    expect(resolveCreepRenderDepth(TOWER_BOTTOM_Y - 0.5, false, CELL)).toBeLessThan(towerDepth);
    expect(resolveCreepRenderDepth(TOWER_BOTTOM_Y - 40, false, CELL)).toBeLessThan(towerDepth);
  });

  it('only changes when the creep crosses a cell row', () => {
    expect(resolveCreepRenderDepth(100, false, CELL)).toBe(
      resolveCreepRenderDepth(111, false, CELL),
    );
    expect(resolveCreepRenderDepth(112, false, CELL)).toBeGreaterThan(
      resolveCreepRenderDepth(111, false, CELL),
    );
  });

  it('keeps flyers above every ground actor', () => {
    const bottomTower = resolveTowerRenderDepth({ x: 18, y: 28 }, CELL);

    expect(resolveCreepRenderDepth(0, true, CELL)).toBeGreaterThan(bottomTower);
  });
});

describe('syncCreepRenderDepth', () => {
  function createCreep(y: number, moveType: UnitMoveType): CreepRenderState {
    const sprite = {
      y,
      depth: 0,
      setDepth: vi.fn((depth: number) => {
        sprite.depth = depth;
        return sprite;
      }),
    };
    return {
      entity: { moveType },
      sprite: sprite as unknown as Phaser.GameObjects.Sprite,
    } as unknown as CreepRenderState;
  }

  it('sets the depth once per row instead of every move', () => {
    const creep = createCreep(100, UnitMoveType.GROUND);
    const setDepth = vi.mocked(creep.sprite.setDepth);

    syncCreepRenderDepth(creep);
    creep.sprite.y = 105;
    syncCreepRenderDepth(creep);
    creep.sprite.y = 110;
    syncCreepRenderDepth(creep);
    expect(setDepth).toHaveBeenCalledTimes(1);

    creep.sprite.y = 113;
    syncCreepRenderDepth(creep);
    expect(setDepth).toHaveBeenCalledTimes(2);
  });

  it('puts an airborne creep on the flyer depth', () => {
    const creep = createCreep(300, UnitMoveType.AIR);

    syncCreepRenderDepth(creep);

    expect(creep.sprite.depth).toBe(AIR_CREEP_RENDER_DEPTH);
  });
});
