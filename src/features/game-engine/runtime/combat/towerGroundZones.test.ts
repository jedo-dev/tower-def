import { describe, expect, it, vi } from 'vitest';
import type { TowerGroundZone } from '../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import {
  DamageType,
  EffectId,
  TowerTypeId,
  UnitMoveType,
} from '../../../../shared/types/content-ids';
import {
  createFixtureCreep,
  createFixtureTower,
  createRecordingHooks,
  damageTaken,
} from '../../test/combatCoreFixtures';
import type { BattlefieldRenderState } from '../battlefield/battlefieldRenderState';
import { renderGroundZones } from './groundZoneRenderer';
import { resolveTowerAttacks, tickFieldCreepEffects } from './towerCombatCore';
import type { CombatCreep, CombatField, CombatTower } from './towerCombatTypes';
import { createGroundZoneStore } from './towerGroundZones';

// Combat-core integration: ground zones (tower-def-bge.9: Plague Cloud,
// Spores, Quagmire). The tower's footprint centre is the origin; its shot
// lands on the target at (4, 0), where the zone is left.
const TOWER_AT_ORIGIN = { x: -0.5, y: -0.5 };
const CLOUD: TowerGroundZone = {
  radiusCells: 1.5,
  durationMs: 2_000,
  tickMs: 500,
  damage: 10,
  damageType: DamageType.MAGICAL,
  chill: 0.3,
};

function zoneField(creeps: CombatCreep[], zone: TowerGroundZone = CLOUD) {
  const tower = createFixtureTower({
    position: TOWER_AT_ORIGIN,
    stats: { damage: 1, attackCooldownMs: 60_000 },
    abilities: { groundZone: zone },
  });
  const field: CombatField<CombatCreep, CombatTower> = {
    towers: [tower],
    creeps,
    groundZones: createGroundZoneStore(),
  };
  return field;
}

function target() {
  return createFixtureCreep('target', { x: 4, y: 0 }, { remainingRouteDistance: 1 });
}

/** Fires once, then steps the effects for `durationMs` in 50 ms steps. */
function run(field: CombatField<CombatCreep, CombatTower>, durationMs: number) {
  const hooks = createRecordingHooks();
  resolveTowerAttacks(field, hooks, 0);
  for (let elapsed = 0; elapsed < durationMs; elapsed += 50) {
    tickFieldCreepEffects(field, hooks, 50);
  }
  return hooks;
}

describe('ground zones', () => {
  it('ticks damage on ground creeps inside for its duration, then expires', () => {
    const inside = createFixtureCreep('inside', { x: 4, y: 1 });
    const outside = createFixtureCreep('outside', { x: 4, y: 2 });
    const flier = createFixtureCreep('flier', { x: 4.5, y: 0 }, { moveType: UnitMoveType.AIR });
    const shot = target();
    const field = zoneField([shot, inside, outside, flier]);
    run(field, 3_000);

    expect(damageTaken(inside)).toBe(40);
    expect(damageTaken(shot)).toBe(41);
    expect(damageTaken(outside)).toBe(0);
    expect(damageTaken(flier)).toBe(0);
    expect(field.groundZones?.count).toBe(0);
  });

  it('chills creeps inside, and a zone that only slows deals no damage', () => {
    const inside = createFixtureCreep('inside', { x: 4, y: 1 });
    const field = zoneField([target(), inside], { ...CLOUD, damage: 0 });
    const hooks = createRecordingHooks();
    resolveTowerAttacks(field, hooks, 0);
    tickFieldCreepEffects(field, hooks, 50);

    expect(inside.entity.activeEffects?.find((effect) => effect.id === EffectId.CHILL)).toEqual(
      expect.objectContaining({ magnitude: 0.3 }),
    );
    expect(damageTaken(inside)).toBe(0);
  });

  it('credits zone kills to the tower and reuses retired zone records', () => {
    const weak = createFixtureCreep('weak', { x: 4, y: 1 }, { hp: 15 });
    const field = zoneField([target(), weak]);
    const hooks = run(field, 3_000);
    expect(hooks.kills).toEqual([{ creepId: 'weak', killerId: 'tower:fixture' }]);

    const record = field.groundZones?.zones[0];
    field.towers[0].runtime.attackCooldownRemainingMs = 0;
    run(field, 100);
    expect(field.groundZones?.zones[0]).toBe(record);
    expect(field.groundZones?.zones).toHaveLength(1);
  });

  it('a splash tower leaves its zone under the primary target', () => {
    const shot = createFixtureCreep('target', { x: 2, y: 0 }, { remainingRouteDistance: 1 });
    const field = zoneField([shot]);
    field.towers[0].entity.type = TowerTypeId.SPLASH;
    field.towers[0].entity.combatStats.splashRadius = 3;
    resolveTowerAttacks(field, createRecordingHooks(), 0);
    expect(field.groundZones?.zones[0]).toEqual(expect.objectContaining({ x: 2, y: 0 }));
  });
});

describe('renderGroundZones', () => {
  it('draws one circle per live zone and wipes the drawing when none remain', () => {
    const graphics = {
      setDepth: vi.fn(),
      clear: vi.fn(),
      fillStyle: vi.fn(),
      lineStyle: vi.fn(),
      fillCircle: vi.fn(),
      strokeCircle: vi.fn(),
    };
    const field = zoneField([target()]);
    resolveTowerAttacks(field, createRecordingHooks(), 0);
    const battlefield = { groundZones: field.groundZones } as BattlefieldRenderState;
    const deps = {
      scene: { add: { graphics: () => graphics } } as never,
      writeCellCenter: (position: { x: number; y: number }, out: { x: number; y: number }) => {
        out.x = position.x * GRID_DIMENSIONS.cellSize;
        out.y = position.y * GRID_DIMENSIONS.cellSize;
      },
    };

    renderGroundZones(battlefield, deps);
    expect(graphics.fillCircle).toHaveBeenCalledWith(
      4 * GRID_DIMENSIONS.cellSize,
      0,
      1.5 * GRID_DIMENSIONS.cellSize,
    );

    battlefield.groundZones.count = 0;
    graphics.clear.mockClear();
    renderGroundZones(battlefield, deps);
    expect(graphics.clear).toHaveBeenCalledTimes(1);
    expect(graphics.fillCircle).toHaveBeenCalledTimes(1);
  });
});
