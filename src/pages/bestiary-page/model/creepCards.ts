import type { UnitConfig } from '../../../entities/unit';
import { describeArmor } from './combatTypeDisplay';
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

export function mapUnitToCreepCard(unit: UnitConfig): CreepCardViewModel {
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
    economy: getTierEconomy(unit.tier),
    description: unit.description ?? null,
    lore: readLore(unit),
  };
}

/** Tier-sorted; creeps of one tier keep their authored order. */
export function mapUnitsToCreepCards(units: readonly UnitConfig[]): CreepCardViewModel[] {
  return [...units].sort((left, right) => left.tier - right.tier).map(mapUnitToCreepCard);
}
