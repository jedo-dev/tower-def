import { Faction, UnitTier, type UnitConfig } from '../types';

const TIER_HEALTH_BASE = 100;
const TIER_HEALTH_STEP = 80;
const TIER_SPEED_BASE = 1.4;
const TIER_SPEED_STEP = 0.1;
const TIER_ARMOR_BASE = 0;
const TIER_ARMOR_STEP = 1;
const TIER_DAMAGE_BASE = 10;
const TIER_DAMAGE_STEP = 7;
const TIER_REWARD_BASE = 6;
const TIER_REWARD_STEP = 4;

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

type HumanUnitSeed = Pick<UnitConfig, 'id' | 'name' | 'tier' | 'spriteKey' | 'description'>;

function createHumanUnit(seed: HumanUnitSeed): UnitConfig {
  return {
    id: seed.id,
    name: seed.name,
    faction: Faction.HUMAN,
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

export const humanUnits: UnitConfig[] = [
  createHumanUnit({
    id: 'human_militia',
    name: 'Militia',
    tier: UnitTier.TIER_1,
    spriteKey: 'unit.human.militia',
    description: 'Common folk pressed into service with pitchforks and hope.',
  }),
  createHumanUnit({
    id: 'human_footman',
    name: 'Footman',
    tier: UnitTier.TIER_2,
    spriteKey: 'unit.human.footman',
    description: 'Disciplined soldier bearing shield and sword.',
  }),
  createHumanUnit({
    id: 'human_rifleman',
    name: 'Rifleman',
    tier: UnitTier.TIER_3,
    spriteKey: 'unit.human.rifleman',
    description: 'Sharpshooter armed with a dwarven-crafted rifle.',
  }),
  createHumanUnit({
    id: 'human_siege_engine',
    name: 'Siege Engine',
    tier: UnitTier.TIER_4,
    spriteKey: 'unit.human.siege_engine',
    description: 'Armored war machine built to break fortifications.',
  }),
];

export function getHumanUnitsByTier(tier: UnitTier): UnitConfig[] {
  return humanUnits.filter((unit) => unit.tier === tier);
}
