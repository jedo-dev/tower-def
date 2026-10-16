import type { UnitConfig } from '../../../entities/unit';
import { describeArmor } from './combatTypeDisplay';
import { mapCreatureBranches } from './creepBranchCards';
import { describeCreatureAbilities, NO_CREATURE_SPECIAL } from './creatureAbilityLines';
import { creatureBodyReadings, goldReading } from './statReadings';
import { getTierEconomy } from './tierEconomy';
import type { CreepCardViewModel } from './types';

/**
 * Lore is being authored into the content files in parallel; until the
 * content types carry it, it is read as an optional string off the config.
 */
export function readLore(entity: object): string | null {
  const lore: unknown = 'lore' in entity ? entity.lore : undefined;
  return typeof lore === 'string' && lore.length > 0 ? lore : null;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function mapUnitToCreepCard(unit: UnitConfig): CreepCardViewModel {
  const economy = getTierEconomy(unit.tier);
  const bodyStats = creatureBodyReadings(unit, null);
  const abilities = describeCreatureAbilities(unit.abilities);

  return {
    id: unit.id,
    name: unit.name,
    tier: unit.tier,
    health: unit.health,
    speed: unit.speed,
    physicalArmor: unit.physicalArmor,
    magicalArmor: unit.magicalArmor,
    physicalArmorHint: describeArmor('physical', unit.physicalArmor),
    magicalArmorHint: describeArmor('magical', unit.magicalArmor),
    sizeClass: unit.sizeClass,
    moveType: unit.moveType,
    rewardGold: unit.rewardGold,
    economy,
    traitsLabel: `${capitalize(unit.moveType)} · ${capitalize(unit.sizeClass)}`,
    tileStats: [bodyStats[0], bodyStats[1], goldReading('Send cost, gold', economy.sendCost)],
    bodyStats,
    abilities: abilities === NO_CREATURE_SPECIAL ? null : abilities,
    description: unit.description ?? null,
    lore: readLore(unit),
    talentBranches: mapCreatureBranches(unit.talentBranches, unit),
  };
}

/** Tier-sorted; creeps of one tier keep their authored order. */
export function mapUnitsToCreepCards(units: readonly UnitConfig[]): CreepCardViewModel[] {
  return [...units].sort((left, right) => left.tier - right.tier).map(mapUnitToCreepCard);
}
