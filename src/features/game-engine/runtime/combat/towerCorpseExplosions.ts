import {
  applyDamageToCreep,
  getCreepFootprintCenterOffsetInCells,
  isCreepHidden,
} from '../../../../entities/creep';
import { canTowerTargetCreep, resolveTowerDamageType } from '../../../../entities/tower';
import { TOWER_ABILITY_BALANCE } from '../../../../shared/constants/towerAbilities';
import { CreatureDamageShape } from '../../../../shared/types/creatureAbilities';
import type { CombatCreep, CombatField, CombatTower, TowerCombatHooks } from './towerCombatTypes';

// Corpse explosions (tower-def-bge.9, Corpse Blast): a creep a tower with
// `corpseExplosionShare` kills explodes for that share of its maximum health
// on every valid creep within `corpseExplosionRadiusCells`. Creeps the blast
// kills explode in turn while the chain stays within
// `corpseExplosionChainLimit` generations. Kills are queued as they land and
// resolved once the attack is done, first in first out, each explosion
// walking the field in order: the same battlefield always chains the same way.

/**
 * Pending explosions, reused as a queue: `queueLength` slots are filled,
 * `queueHead` is the next to resolve. Slots are cleared when the queue drains,
 * so dead creeps are not retained; the arrays only grow with the largest chain.
 */
const queuedCreeps: (CombatCreep | undefined)[] = [];
const queuedTowers: (CombatTower | undefined)[] = [];
const queuedGenerations: number[] = [];
let queueHead = 0;
let queueLength = 0;

/** The module-wide explosion queue; exposed so tests can check it drains and is reused. */
export function getCorpseExplosionQueue(): readonly (CombatCreep | undefined)[] {
  return queuedCreeps;
}

function enqueue(creep: CombatCreep, tower: CombatTower, generation: number): void {
  if (queueLength < queuedCreeps.length) {
    queuedCreeps[queueLength] = creep;
    queuedTowers[queueLength] = tower;
    queuedGenerations[queueLength] = generation;
  } else {
    queuedCreeps.push(creep);
    queuedTowers.push(tower);
    queuedGenerations.push(generation);
  }
  queueLength += 1;
}

function chainLimit(tower: CombatTower): number {
  return (
    tower.entity.combatStats.abilities?.corpseExplosionChainLimit ??
    TOWER_ABILITY_BALANCE.defaultCorpseExplosionChainLimit
  );
}

/** Pays out a kill credited to `tower` and queues its corpse explosion, if the tower has one. */
function creditKill<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  tower: T,
  hooks: TowerCombatHooks<C, T>,
  generation: number,
): void {
  hooks.onCreepKilled(creep, tower);
  const abilities = tower.entity.combatStats.abilities;
  if (abilities?.corpseExplosionShare !== undefined && generation <= chainLimit(tower)) {
    enqueue(creep, tower, generation);
  }
}

/** The kill path of every tower hit: pays the kill and queues a corpse explosion. */
export function reportTowerKill<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  tower: T,
  hooks: TowerCombatHooks<C, T>,
): void {
  creditKill(creep, tower, hooks, 1);
}

function isInBlast(corpse: CombatCreep, creep: CombatCreep, radiusCells: number): boolean {
  const corpseOffset = getCreepFootprintCenterOffsetInCells(corpse.entity.sizeClass);
  const offset = getCreepFootprintCenterOffsetInCells(creep.entity.sizeClass);
  const dx = creep.entity.position.x + offset - (corpse.entity.position.x + corpseOffset);
  const dy = creep.entity.position.y + offset - (corpse.entity.position.y + corpseOffset);
  return Math.hypot(dx, dy) <= radiusCells;
}

function explode<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  corpse: C,
  tower: T,
  generation: number,
  hooks: TowerCombatHooks<C, T>,
): void {
  const abilities = tower.entity.combatStats.abilities;
  const share = abilities?.corpseExplosionShare ?? 0;
  const radiusCells = abilities?.corpseExplosionRadiusCells ?? 0;
  const damage = share * (corpse.entity.maxHp ?? 0);
  if (damage <= 0 || radiusCells <= 0) {
    return;
  }
  const damageType = resolveTowerDamageType(tower.entity);
  let totalDamage = 0;

  for (const creep of field.creeps) {
    const entity = creep.entity;
    if (
      creep === corpse ||
      entity.status !== 'alive' ||
      isCreepHidden(entity) ||
      !canTowerTargetCreep(tower.entity, entity) ||
      !isInBlast(corpse, creep, radiusCells)
    ) {
      continue;
    }
    const result = applyDamageToCreep(entity, damage, damageType, CreatureDamageShape.SPLASH);
    creep.entity = result.creep;
    totalDamage += result.damageApplied;
    if (result.revived === true) {
      hooks.onCreepRevived?.(creep);
    }
    hooks.onCreepHit(creep);
    if (result.killed) {
      creditKill(creep, tower, hooks, generation + 1);
    }
  }

  hooks.onDamageDealt(corpse.entity.position, Math.round(totalDamage), 'hit');
}

/**
 * Resolves every queued corpse explosion, chains included, then clears the
 * queue. Called after each attack; does nothing when nothing is queued.
 */
export function resolveCorpseExplosions<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  hooks: TowerCombatHooks<C, T>,
): void {
  if (queueLength === 0) {
    return;
  }
  try {
    while (queueHead < queueLength) {
      const index = queueHead;
      queueHead += 1;
      // Slots were filled from this field's creeps and towers (types C and T).
      explode(
        field,
        queuedCreeps[index] as C,
        queuedTowers[index] as T,
        queuedGenerations[index],
        hooks,
      );
    }
  } finally {
    for (let index = 0; index < queueLength; index += 1) {
      queuedCreeps[index] = undefined;
      queuedTowers[index] = undefined;
    }
    queueHead = 0;
    queueLength = 0;
  }
}
