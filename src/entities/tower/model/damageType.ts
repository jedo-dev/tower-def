import type { DamageType } from '../../../shared/types/content-ids';
import { tryResolveBuildableTowerById } from './config/buildableTowers';
import type { BuildableTowerConfig, TowerEntity } from './types';
import { TOWER_ARCHETYPE_DEFINITIONS } from './types';

/** Damage type an authored tower deals: its own override, its archetype's otherwise. */
export function resolveBuildableTowerDamageType(
  tower: Pick<BuildableTowerConfig, 'towerType' | 'damageType'>,
): DamageType {
  return tower.damageType ?? TOWER_ARCHETYPE_DEFINITIONS[tower.towerType].damageType;
}

/**
 * Damage type a placed tower deals: the authored tower's when it was built
 * from content, the archetype's otherwise (towers without content, tests).
 * A map lookup, no allocation: combat resolves it once per attack.
 */
export function resolveTowerDamageType(
  tower: Pick<TowerEntity, 'type' | 'buildableTowerId'>,
): DamageType {
  const authored =
    tower.buildableTowerId === undefined
      ? undefined
      : tryResolveBuildableTowerById(tower.buildableTowerId);

  return authored?.damageType ?? TOWER_ARCHETYPE_DEFINITIONS[tower.type].damageType;
}
