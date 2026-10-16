import {
  applyDamageToCreep,
  getCreepFootprintCenterOffsetInCells,
  isCreepGrounded,
  isCreepHidden,
  type ApplyEffectInput,
} from '../../../../entities/creep';
import type { TowerGroundZone } from '../../../../entities/tower';
import { TOWER_ABILITY_BALANCE } from '../../../../shared/constants/towerAbilities';
import { EffectId, UnitMoveType, type DamageType } from '../../../../shared/types/content-ids';
import { CreatureDamageShape } from '../../../../shared/types/creatureAbilities';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';
import { reportTowerKill, resolveCorpseExplosions } from './towerCorpseExplosions';
import { applyTowerEffect } from './towerStrike';

// Ground zones (tower-def-bge.9: Plague Cloud, Spores, Quagmire). A tower with
// `abilities.groundZone` leaves a zone where its shot lands; every `tickMs`
// the zone damages and chills each ground creep inside (grounded fliers too).
// Zones live in a per-field store whose records are reused, so steady combat
// allocates nothing once the store has grown to its busiest moment.

/** One live zone; records are recycled, so nothing outside the store keeps one. */
export type GroundZoneState = {
  /** Centre in cells (the same frame as creep footprint centres). */
  x: number;
  y: number;
  radiusCells: number;
  remainingMs: number;
  nextTickInMs: number;
  tickMs: number;
  damage: number;
  damageType: DamageType;
  /** Chill applied each tick; undefined when the zone only damages. */
  chillInput: Readonly<ApplyEffectInput> | undefined;
  /** The tower that left the zone; its kills are credited to it. */
  tower: CombatTower | undefined;
};

/** The zones of one battlefield: `zones[0..count)` are live, the rest are spare records. */
export type GroundZoneStore = { zones: GroundZoneState[]; count: number };

export function createGroundZoneStore(): GroundZoneStore {
  return { zones: [], count: 0 };
}

/** Drops every zone (a new wave or a restart); spare records are kept, towers released. */
export function clearGroundZones(store: GroundZoneStore): void {
  for (let index = 0; index < store.count; index += 1) {
    store.zones[index].tower = undefined;
  }
  store.count = 0;
}

/**
 * One frozen chill input per authored zone, built on first use. Zone shapes are
 * parsed content nothing mutates; weak keys let a reloaded one go.
 */
const chillInputByZone = new WeakMap<TowerGroundZone, Readonly<ApplyEffectInput>>();

function getZoneChillInput(zone: TowerGroundZone): Readonly<ApplyEffectInput> | undefined {
  if (zone.chill === undefined) {
    return undefined;
  }
  let input = chillInputByZone.get(zone);
  if (input === undefined) {
    input = Object.freeze({
      effectId: EffectId.CHILL,
      magnitude: zone.chill,
      durationMs: zone.tickMs + TOWER_ABILITY_BALANCE.groundZoneChillLingerMs,
    });
    chillInputByZone.set(zone, input);
  }
  return input;
}

/**
 * Leaves `zone` centred on (`x`, `y`) cells. The first tick lands at once.
 * A store at `TOWER_ABILITY_BALANCE.maxGroundZonesPerField` drops the new zone.
 */
export function spawnGroundZone(
  store: GroundZoneStore,
  tower: CombatTower,
  zone: TowerGroundZone,
  x: number,
  y: number,
): void {
  if (store.count >= TOWER_ABILITY_BALANCE.maxGroundZonesPerField) {
    return;
  }
  let record = store.zones[store.count];
  if (record === undefined) {
    record = {
      x: 0,
      y: 0,
      radiusCells: 0,
      remainingMs: 0,
      nextTickInMs: 0,
      tickMs: 0,
      damage: 0,
      damageType: zone.damageType,
      chillInput: undefined,
      tower: undefined,
    };
    store.zones.push(record);
  }
  record.x = x;
  record.y = y;
  record.radiusCells = zone.radiusCells;
  record.remainingMs = zone.durationMs;
  record.nextTickInMs = 0;
  record.tickMs = zone.tickMs;
  record.damage = zone.damage;
  record.damageType = zone.damageType;
  record.chillInput = getZoneChillInput(zone);
  record.tower = tower;
  store.count += 1;
}

/** Leaves the tower's zone (if it has one) under the creep its shot landed on. */
export function spawnTowerGroundZone<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
): void {
  const zone = tower.entity.combatStats.abilities?.groundZone;
  if (zone === undefined || field.groundZones === undefined) {
    return;
  }
  const offset = getCreepFootprintCenterOffsetInCells(target.entity.sizeClass);
  spawnGroundZone(
    field.groundZones,
    tower,
    zone,
    target.entity.position.x + offset,
    target.entity.position.y + offset,
  );
}

function isInZone(zone: GroundZoneState, creep: CombatCreep): boolean {
  const entity = creep.entity;
  if (
    entity.status !== 'alive' ||
    isCreepHidden(entity) ||
    (entity.moveType !== UnitMoveType.GROUND && !isCreepGrounded(entity))
  ) {
    return false;
  }
  const offset = getCreepFootprintCenterOffsetInCells(entity.sizeClass);
  const dx = entity.position.x + offset - zone.x;
  const dy = entity.position.y + offset - zone.y;
  return Math.hypot(dx, dy) <= zone.radiusCells;
}

function tickZone<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  zone: GroundZoneState,
  hooks: TowerCombatHooks<C, T>,
): void {
  // The zone's tower is one of this field's towers (type T).
  const tower = zone.tower as T | undefined;
  for (const creep of field.creeps) {
    if (!isInZone(zone, creep)) {
      continue;
    }
    if (zone.damage > 0) {
      const result = applyDamageToCreep(
        creep.entity,
        zone.damage,
        zone.damageType,
        CreatureDamageShape.DOT,
      );
      creep.entity = result.creep;
      if (result.revived === true) {
        hooks.onCreepRevived?.(creep);
      }
      hooks.onDamageDealt(creep.entity.position, Math.round(result.damageApplied), 'effect');
      if (result.killed) {
        if (tower === undefined) {
          hooks.onCreepKilled(creep);
        } else {
          reportTowerKill(creep, tower, hooks);
        }
        continue;
      }
    }
    if (zone.chillInput !== undefined) {
      applyTowerEffect(creep, zone.chillInput, hooks);
    }
  }
}

/**
 * Advances every zone of the field: ticks the due ones (at most one tick per
 * call) and retires expired ones by swapping in the last live record, so the
 * order stays deterministic. Does nothing on a field without zones.
 */
export function tickGroundZones<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
  deltaMs: number,
): void {
  const store = field.groundZones;
  if (store === undefined || store.count === 0) {
    return;
  }

  let index = 0;
  while (index < store.count) {
    const zone = store.zones[index];
    zone.nextTickInMs -= deltaMs;
    zone.remainingMs -= deltaMs;
    // `durationMs / tickMs` ticks: the first on the zone's first step, none on its last.
    if (zone.nextTickInMs <= 0 && zone.remainingMs > 0) {
      tickZone(field, zone, hooks);
      zone.nextTickInMs += zone.tickMs;
    }
    if (zone.remainingMs > 0) {
      index += 1;
      continue;
    }
    zone.tower = undefined;
    const last = store.count - 1;
    store.zones[index] = store.zones[last];
    store.zones[last] = zone;
    store.count = last;
  }

  resolveCorpseExplosions(field, hooks);
}
