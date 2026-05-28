import { Faction, UnitTier, type UnitConfig } from '../types';

const TIER_HEALTH_BASE = 90;
const TIER_HEALTH_STEP = 70;
const TIER_SPEED_BASE = 1.5;
const TIER_SPEED_STEP = 0.1;
const TIER_ARMOR_BASE = 0;
const TIER_ARMOR_STEP = 0;
const TIER_DAMAGE_BASE = 11;
const TIER_DAMAGE_STEP = 8;
const TIER_REWARD_BASE = 7;
const TIER_REWARD_STEP = 5;

function getHealthByTier(tier: UnitTier): number {
  return TIER_HEALTH_BASE + (tier - 1) * TIER_HEALTH_STEP;
}

function getSpeedByTier(tier: UnitTier): number {
  return Number((TIER_SPEED_BASE - (tier - 1) * TIER_SPEED_STEP).toFixed(2));
}

function getArmorByTier(tier: UnitTier): number {
  return TIER_ARMOR_BASE + (tier - 1) * TIER_ARMOR_STEP;
}

function getDamageByTier(tier: UnitTier): number {
  return TIER_DAMAGE_BASE + (tier - 1) * TIER_DAMAGE_STEP;
}

function getRewardGoldByTier(tier: UnitTier): number {
  return TIER_REWARD_BASE + (tier - 1) * TIER_REWARD_STEP;
}

type ElfUnitSeed = Pick<UnitConfig, 'id' | 'name' | 'tier' | 'spriteKey' | 'description'>;

function createElfUnit(seed: ElfUnitSeed): UnitConfig {
  return {
    id: seed.id,
    name: seed.name,
    faction: Faction.ELF,
    tier: seed.tier,
    health: getHealthByTier(seed.tier),
    speed: getSpeedByTier(seed.tier),
    armor: getArmorByTier(seed.tier),
    damage: getDamageByTier(seed.tier),
    rewardGold: getRewardGoldByTier(seed.tier),
    spriteKey: seed.spriteKey,
    description: seed.description,
  };
}

export const elfUnits: UnitConfig[] = [
  createElfUnit({
    id: 'elf_archer',
    name: 'Archer',
    tier: UnitTier.TIER_1,
    spriteKey: 'unit.elf.archer',
    description: 'Swift sentinel striking from the shadows of the forest.',
  }),
  createElfUnit({
    id: 'elf_huntress',
    name: 'Huntress',
    tier: UnitTier.TIER_2,
    spriteKey: 'unit.elf.huntress',
    description: 'Mounted warrior wielding glaives of moonlit steel.',
  }),
  createElfUnit({
    id: 'elf_dryad',
    name: 'Dryad',
    tier: UnitTier.TIER_3,
    spriteKey: 'unit.elf.dryad',
    description: 'Half-spirit creature immune to magical corruption.',
  }),
  createElfUnit({
    id: 'elf_chimera',
    name: 'Chimera',
    tier: UnitTier.TIER_4,
    spriteKey: 'unit.elf.chimera',
    description: 'Twin-headed beast raining acid and flame.',
  }),
];

export function getElfUnitsByTier(tier: UnitTier): UnitConfig[] {
  return elfUnits.filter((unit) => unit.tier === tier);
}
