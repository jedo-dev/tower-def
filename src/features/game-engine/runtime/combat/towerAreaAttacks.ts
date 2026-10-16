import { isCreepHidden } from '../../../../entities/creep';
import { canTowerTargetCreep, getTowerCenter, resolveTowerChain } from '../../../../entities/tower';
import { GRID_DIMENSIONS } from '../../../../shared/constants/grid';
import type { DamageType } from '../../../../shared/types/content-ids';
import {
  DEFAULT_SPLASH_RADIUS_CELLS,
  type CombatCreep,
  type CombatField,
  type CombatTower,
  type PixelPoint,
  type TowerCombatHooks,
} from './towerCombatTypes';
import { writeCreepFootprintCenterPx } from './combatCellCenter';
import { getSharedChainTargetScratch, selectChainTargets } from './chainTargetSelection';
import { strikeAndReport, strikeCreep } from './towerStrike';

// Splash and chain attack shapes. `shotDamage` is the tower damage after
// shot-wide abilities (a critical hit); per-target abilities apply per strike.

export function applySingleTargetDamage<C extends CombatCreep, T extends CombatTower>(
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  const result = strikeCreep(tower, target, shotDamage, damageType, hooks);
  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(result.damageApplied), 'hit');

  if (result.killed) {
    hooks.onCreepKilled(target, tower);
  }
}

/**
 * Creeps a splash shot hits, collected before any of them is struck (a kill
 * during the strikes must not change who the blast caught). Used as a stack:
 * a shot claims the slots from `splashTargetTop` up and releases them when it
 * is done, so a splash fired from inside another one's hooks cannot clobber
 * the outer selection. Slots are cleared on release so dead creeps are not
 * retained; the array itself is reused, so a splash shot allocates nothing
 * once it has grown to the largest blast.
 */
const splashTargets: (CombatCreep | undefined)[] = [];
let splashTargetTop = 0;

/**
 * Pixel centres the blast measures from. Collection calls no hook but
 * `writeCellCenter`, so a nested splash cannot run while these are in use.
 */
const splashTowerCenterPx: PixelPoint = { x: 0, y: 0 };
const splashCreepCenterPx: PixelPoint = { x: 0, y: 0 };

const splashCenterScratch: readonly PixelPoint[] = [splashTowerCenterPx, splashCreepCenterPx];

/** The splash scratch points; exposed so tests can check reuse. */
export function getSplashCenterScratch(): readonly PixelPoint[] {
  return splashCenterScratch;
}

/** The module-wide splash target stack; exposed so tests can check reuse. */
export function getSplashTargetBuffer(): readonly (CombatCreep | undefined)[] {
  return splashTargets;
}

function isInSplash<C extends CombatCreep, T extends CombatTower>(
  creep: C,
  tower: T,
  hooks: TowerCombatHooks<C, T>,
  towerCenterPx: PixelPoint,
  splashRadiusPx: number,
): boolean {
  if (
    creep.entity.status !== 'alive' ||
    isCreepHidden(creep.entity) ||
    !canTowerTargetCreep(tower.entity, creep.entity)
  ) {
    return false;
  }
  const creepCenter = splashCreepCenterPx;
  writeCreepFootprintCenterPx(hooks, creep.entity, creepCenter);
  const distance = Math.hypot(creepCenter.x - towerCenterPx.x, creepCenter.y - towerCenterPx.y);
  return distance <= splashRadiusPx;
}

/** Pushes the creeps the blast catches onto the stack; returns the new top. */
function collectSplashTargets<C extends CombatCreep, T extends CombatTower>(
  creeps: readonly C[],
  tower: T,
  hooks: TowerCombatHooks<C, T>,
  start: number,
): number {
  const splashRadius = tower.entity.combatStats.splashRadius ?? DEFAULT_SPLASH_RADIUS_CELLS;
  const splashRadiusPx = splashRadius * GRID_DIMENSIONS.cellSize;
  const towerCenterPx = splashTowerCenterPx;
  hooks.writeCellCenter(getTowerCenter(tower.entity), towerCenterPx);
  let end = start;

  for (let index = 0; index < creeps.length; index += 1) {
    const creep = creeps[index];
    if (!isInSplash(creep, tower, hooks, towerCenterPx, splashRadiusPx)) {
      continue;
    }
    if (end < splashTargets.length) {
      splashTargets[end] = creep;
    } else {
      splashTargets.push(creep);
    }
    end += 1;
  }

  return end;
}

export function applySplashDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  // A ground-only splash never touches a flier over its blast; a both-scope one does.
  const start = splashTargetTop;
  const end = collectSplashTargets(field.creeps, tower, hooks, start);
  splashTargetTop = end;

  let totalDamageDealt = 0;
  try {
    for (let index = start; index < end; index += 1) {
      // Slots in [start, end) were filled from this field's creeps (type C).
      const creep = splashTargets[index] as C;
      const result = strikeCreep(tower, creep, shotDamage, damageType, hooks);
      totalDamageDealt += result.damageApplied;

      if (result.killed) {
        hooks.onCreepKilled(creep, tower);
      }
    }
  } finally {
    for (let index = start; index < end; index += 1) {
      splashTargets[index] = undefined;
    }
    splashTargetTop = start;
  }

  hooks.onTargetStruck(tower);
  hooks.onDamageDealt(target.entity.position, Math.round(totalDamageDealt), 'hit');
}

export function applyChainDamage<C extends CombatCreep, T extends CombatTower>(
  field: CombatField<C, T>,
  tower: T,
  target: C,
  shotDamage: number,
  damageType: DamageType,
  hooks: TowerCombatHooks<C, T>,
): void {
  const chainShape = resolveTowerChain(tower.entity.type, tower.entity.combatStats);

  applySingleTargetDamage(tower, target, shotDamage, damageType, hooks);

  if (!chainShape) {
    return;
  }

  // Selection writes into a reused scratch buffer: a chain shot allocates nothing.
  const scratch = getSharedChainTargetScratch();
  const chainTargetCount = selectChainTargets(
    field,
    hooks,
    tower,
    target,
    chainShape.bounces,
    chainShape.bounceRangeCells,
    scratch,
  );

  let arcDamage = shotDamage;

  for (let index = 0; index < chainTargetCount; index += 1) {
    // Slots hold creeps of this field (type C); clear each so dead creeps are not retained.
    const creep = scratch.targets[index] as C;
    scratch.targets[index] = undefined;
    arcDamage *= 1 - chainShape.damageFalloff;
    strikeAndReport(tower, creep, arcDamage, damageType, hooks);
  }
}
