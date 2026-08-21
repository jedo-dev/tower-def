import {
  getBuildableTowersByFaction,
  getTowerArchetype,
  type BuildableTowerConfig,
} from '../../../entities/tower';
import { EffectId, RaceId, TowerAttackKind, type TowerTypeId } from '../../../shared/types/content-ids';

/**
 * The build bar is generated from the race the player is building for, so a
 * race that gains a tower gains a button without any UI change.
 */
export type HudBuildOptionViewModel = {
  towerId: BuildableTowerConfig['id'];
  towerType: TowerTypeId;
  name: string;
  costGold: number;
  /** One-word summary of what the tower does beyond damage. */
  effectHint: string;
  isAffordable: boolean;
  isSelected: boolean;
  ariaLabel: string;
};

const EFFECT_HINTS: Record<EffectId, string> = {
  [EffectId.CHILL]: 'Slows',
  [EffectId.POISON]: 'Poison',
  [EffectId.BURN]: 'Burns',
  [EffectId.STUN]: 'Stuns',
  [EffectId.ARMOR_BREAK]: 'Breaks armor',
};

function resolveEffectHint(towerType: TowerTypeId): string {
  const archetype = getTowerArchetype(towerType);
  const [firstEffect] = archetype.onHitEffects;

  if (firstEffect) {
    return EFFECT_HINTS[firstEffect.effectId];
  }

  switch (archetype.attackKind) {
    case TowerAttackKind.SPLASH:
      return 'Area';
    case TowerAttackKind.CHAIN:
      return `Chains ${archetype.chain?.bounces ?? 0}`;
    case TowerAttackKind.AURA:
      return 'Boosts towers';
    default:
      return 'Single target';
  }
}

export type MapRaceRosterInput = {
  raceId: RaceId;
  gold: number;
  selectedTowerType: TowerTypeId | null;
};

export function mapRaceRosterToBuildOptions(
  input: MapRaceRosterInput,
): HudBuildOptionViewModel[] {
  return getBuildableTowersByFaction(input.raceId).map((tower) => {
    const effectHint = resolveEffectHint(tower.towerType);
    const isAffordable = input.gold >= tower.costGold;

    return {
      towerId: tower.id,
      towerType: tower.towerType,
      name: tower.name,
      costGold: tower.costGold,
      effectHint,
      isAffordable,
      isSelected: input.selectedTowerType === tower.towerType,
      ariaLabel: `${tower.name}, ${tower.costGold} gold, ${effectHint}${isAffordable ? '' : ', not affordable'}`,
    };
  });
}
