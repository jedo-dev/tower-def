import { getTowerOnHitEffects } from '../../../../entities/tower';
import type { TowerTypeId } from '../../../../shared/types/content-ids';
import { CREEP_EFFECT_TINTS } from '../../scenes/gameScene.constants';

/**
 * A shot is coloured by what it does: an effect tower fires in its effect
 * colour, a plain splash tower stays green.
 */
export function resolveShotTint(
  towerType: TowerTypeId,
  isSplash: boolean,
  splashTint: number,
): number | undefined {
  const firstEffect = getTowerOnHitEffects(towerType)[0];

  if (firstEffect) {
    return CREEP_EFFECT_TINTS[firstEffect.effectId];
  }

  return isSplash ? splashTint : undefined;
}
