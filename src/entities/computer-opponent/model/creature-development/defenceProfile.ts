import { DAMAGE_TYPES, EffectId, TowerAttackKind } from '../../../../shared/types/content-ids';
import {
  CreatureDamageShape,
  type CreatureDamageShape as CreatureDamageShapeType,
} from '../../../../shared/types/creatureAbilities';
import { getTowerAttackKind } from '../../../tower/model/types';
import { computeDefenceDamageMix } from '../damage-placement/defenceDamageMix';
import {
  computeChill,
  computeDamageOverTimeDpsByType,
  computeShotDps,
  resolveOnHitEffects,
  type DamageModelTower,
} from '../damage-placement/towerDamageModel';
import { EVEN_DAMAGE_MIX, type DamageTypeMix } from '../damage-profile';

/** Shares of a defence's raw damage per second by how it reaches a creature; they sum to 1. */
export type DamageShapeMix = Readonly<Record<CreatureDamageShapeType, number>>;

/** Share of the defence's raw damage dealt by towers that apply each effect. */
export type EffectCoverage = Readonly<Record<EffectId, number>>;

/**
 * What a sender reads of the defender's towers to value creature talents:
 * damage types (armor), damage shapes (dodge, incoming multipliers), the
 * effects they put on a creature and how hard their chill slows.
 */
export type DefenceProfile = {
  damageMix: DamageTypeMix;
  shapeMix: DamageShapeMix;
  effectCoverage: EffectCoverage;
  /** Mean slow of the chilling towers (0 when none chill), freezes included. */
  chillSlow: number;
};

const NO_EFFECTS: EffectCoverage = Object.freeze({
  [EffectId.CHILL]: 0,
  [EffectId.POISON]: 0,
  [EffectId.BURN]: 0,
  [EffectId.STUN]: 0,
  [EffectId.ARMOR_BREAK]: 0,
  [EffectId.VULNERABILITY]: 0,
});

/** A defence the model knows nothing about: single-target shots, no effects. */
export const UNKNOWN_DEFENCE_PROFILE: DefenceProfile = Object.freeze({
  damageMix: EVEN_DAMAGE_MIX,
  shapeMix: Object.freeze({
    [CreatureDamageShape.SINGLE]: 1,
    [CreatureDamageShape.SPLASH]: 0,
    [CreatureDamageShape.CHAIN]: 0,
    [CreatureDamageShape.DOT]: 0,
  }),
  effectCoverage: NO_EFFECTS,
  chillSlow: 0,
});

function shotShapeOf(tower: DamageModelTower): CreatureDamageShapeType {
  const attackKind = getTowerAttackKind(tower.towerType);
  if (attackKind === TowerAttackKind.SPLASH) {
    return CreatureDamageShape.SPLASH;
  }
  return attackKind === TowerAttackKind.CHAIN
    ? CreatureDamageShape.CHAIN
    : CreatureDamageShape.SINGLE;
}

function sumOverTime(tower: DamageModelTower): number {
  const byType = computeDamageOverTimeDpsByType(tower);
  return DAMAGE_TYPES.reduce((sum, damageType) => sum + byType[damageType], 0);
}

/** The defender's towers as a profile; the unknown profile while they deal no damage. */
export function computeDefenceProfile(towers: readonly DamageModelTower[]): DefenceProfile {
  const shapeDps: Record<CreatureDamageShapeType, number> = {
    [CreatureDamageShape.SINGLE]: 0,
    [CreatureDamageShape.SPLASH]: 0,
    [CreatureDamageShape.CHAIN]: 0,
    [CreatureDamageShape.DOT]: 0,
  };
  const effectDps: Record<EffectId, number> = { ...NO_EFFECTS };
  let chillWeightedSlow = 0;
  let total = 0;
  for (const tower of towers) {
    if (getTowerAttackKind(tower.towerType) === TowerAttackKind.AURA) {
      continue;
    }
    const shotDps = computeShotDps(tower.stats);
    const towerDps = shotDps + sumOverTime(tower);
    shapeDps[shotShapeOf(tower)] += shotDps;
    shapeDps[CreatureDamageShape.DOT] += towerDps - shotDps;
    total += towerDps;
    const applied = new Set(resolveOnHitEffects(tower).map((effect) => effect.effectId));
    for (const effectId of applied) {
      effectDps[effectId] += towerDps;
    }
    if (applied.has(EffectId.CHILL)) {
      chillWeightedSlow += computeChill(tower).magnitude * towerDps;
    }
  }
  if (total <= 0) {
    return UNKNOWN_DEFENCE_PROFILE;
  }
  const effectCoverage = { ...NO_EFFECTS };
  for (const effectId of Object.keys(effectDps) as EffectId[]) {
    effectCoverage[effectId] = effectDps[effectId] / total;
  }
  return {
    damageMix: computeDefenceDamageMix(towers),
    shapeMix: {
      [CreatureDamageShape.SINGLE]: shapeDps[CreatureDamageShape.SINGLE] / total,
      [CreatureDamageShape.SPLASH]: shapeDps[CreatureDamageShape.SPLASH] / total,
      [CreatureDamageShape.CHAIN]: shapeDps[CreatureDamageShape.CHAIN] / total,
      [CreatureDamageShape.DOT]: shapeDps[CreatureDamageShape.DOT] / total,
    },
    effectCoverage,
    chillSlow: effectDps[EffectId.CHILL] > 0 ? chillWeightedSlow / effectDps[EffectId.CHILL] : 0,
  };
}
