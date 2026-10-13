import { TowerAttackKind, TowerTypeId } from '../../../shared/types/content-ids';
import type { TowerEntity } from '../../tower/model/types';
import { getTowerArchetype, getTowerAttackKind } from '../../tower/model/types';

/**
 * How much the opponent values each archetype before composition is taken into
 * account. Control towers are worth slightly more than raw damage because they
 * multiply everything else on the field.
 */
const ARCHETYPE_BASE_VALUE: Record<TowerTypeId, number> = {
  [TowerTypeId.SINGLE]: 1,
  [TowerTypeId.SPLASH]: 1.05,
  [TowerTypeId.FROST]: 1.15,
  [TowerTypeId.POISON]: 1.1,
  [TowerTypeId.CHAIN]: 1.05,
  [TowerTypeId.SUPPORT]: 0.9,
};

/** Bonus for the first crowd control tower on a field that has none. */
const FIRST_CONTROL_TOWER_BONUS = 1.6;
/** Each copy of an archetype makes the next one less attractive. */
const REPEAT_ARCHETYPE_PENALTY = 0.35;
/** A support tower is only worth it once there is something worth buffing. */
const MIN_DAMAGE_TOWERS_PER_SUPPORT = 3;

function isControlArchetype(towerType: TowerTypeId): boolean {
  return getTowerArchetype(towerType).onHitEffects.length > 0;
}

export function isSupportArchetype(towerType: TowerTypeId): boolean {
  return getTowerAttackKind(towerType) === TowerAttackKind.AURA;
}

export function computeArchetypeValueScore(
  towerType: TowerTypeId,
  existingTowers: readonly TowerEntity[],
): number {
  const sameArchetypeCount = existingTowers.filter((tower) => tower.type === towerType).length;
  const damageTowerCount = existingTowers.filter((tower) => !isSupportArchetype(tower.type)).length;
  const supportCount = existingTowers.length - damageTowerCount;

  if (isSupportArchetype(towerType)) {
    // Never let the opponent stack support towers it has nothing to buff.
    const allowedSupportCount = Math.floor(damageTowerCount / MIN_DAMAGE_TOWERS_PER_SUPPORT);
    if (supportCount >= allowedSupportCount) {
      return 0;
    }
  }

  let value = ARCHETYPE_BASE_VALUE[towerType];

  const hasControlTower = existingTowers.some((tower) => isControlArchetype(tower.type));
  if (!hasControlTower && isControlArchetype(towerType) && existingTowers.length > 0) {
    value *= FIRST_CONTROL_TOWER_BONUS;
  }

  return value / (1 + REPEAT_ARCHETYPE_PENALTY * sameArchetypeCount);
}
