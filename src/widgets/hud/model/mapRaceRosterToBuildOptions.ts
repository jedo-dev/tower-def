import {
  getBuildableTowersByFaction,
  getTowerArchetype,
  type BuildableTowerConfig,
} from '../../../entities/tower';
import { toBranchGlyph } from '../../../shared/ui/branch-glyph';
import {
  EffectId,
  RaceId,
  TowerAttackKind,
  type TowerTypeId,
} from '../../../shared/types/content-ids';

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
  /** The talent branch this tower type took this match; `null` while open. */
  chosenBranch: { id: string; name: string; glyph: string } | null;
  /** Hover hint: the tower name, plus its branch once chosen. */
  tooltip: string;
  ariaLabel: string;
};

const EFFECT_HINTS: Record<EffectId, string> = {
  [EffectId.CHILL]: 'Slows',
  [EffectId.POISON]: 'Poison',
  [EffectId.BURN]: 'Burns',
  [EffectId.STUN]: 'Stuns',
  [EffectId.ARMOR_BREAK]: 'Breaks armor',
  [EffectId.VULNERABILITY]: 'Exposes',
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
  /** The player's picks, race tower id to branch id (`GameHudSnapshot.towerBranchChoices`). */
  towerBranchChoices?: Readonly<Record<string, string>>;
};

function resolveChosenBranch(
  tower: BuildableTowerConfig,
  choices: Readonly<Record<string, string>>,
): HudBuildOptionViewModel['chosenBranch'] {
  const chosenId = choices[tower.id];
  const branches = tower.talentBranches;
  const index =
    chosenId === undefined ? -1 : branches.findIndex((branch) => branch.id === chosenId);
  return index < 0
    ? null
    : { id: branches[index].id, name: branches[index].name, glyph: toBranchGlyph(index) };
}

export function mapRaceRosterToBuildOptions(input: MapRaceRosterInput): HudBuildOptionViewModel[] {
  return getBuildableTowersByFaction(input.raceId).map((tower) => {
    const effectHint = resolveEffectHint(tower.towerType);
    const isAffordable = input.gold >= tower.costGold;
    const chosenBranch = resolveChosenBranch(tower, input.towerBranchChoices ?? {});
    const branchSuffix = chosenBranch ? `, branch ${chosenBranch.name}` : '';

    return {
      towerId: tower.id,
      towerType: tower.towerType,
      name: tower.name,
      costGold: tower.costGold,
      effectHint,
      isAffordable,
      isSelected: input.selectedTowerType === tower.towerType,
      chosenBranch,
      tooltip: chosenBranch ? `${tower.name} — ${chosenBranch.name}` : tower.name,
      ariaLabel: `${tower.name}, ${tower.costGold} gold, ${effectHint}${branchSuffix}${isAffordable ? '' : ', not affordable'}`,
    };
  });
}
