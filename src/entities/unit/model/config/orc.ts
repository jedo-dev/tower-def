import { Faction, UnitTier, type UnitConfig } from '../types';

const TIER_HEALTH_BASE = 120;
const TIER_HEALTH_STEP = 90;
const TIER_SPEED_BASE = 1.28;
const TIER_SPEED_STEP = 0.08;
const TIER_ARMOR_BASE = 1;
const TIER_ARMOR_STEP = 1;
const TIER_DAMAGE_BASE = 14;
const TIER_DAMAGE_STEP = 9;
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

type OrcUnitSeed = Pick<UnitConfig, 'id' | 'name' | 'tier' | 'spriteKey' | 'description'>;

function createOrcUnit(seed: OrcUnitSeed): UnitConfig {
  return {
    id: seed.id,
    name: seed.name,
    faction: Faction.ORC,
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

export const orcUnits: UnitConfig[] = [
  createOrcUnit({
    id: 'orc_grunt',
    name: 'Grunt',
    tier: UnitTier.TIER_1,
    spriteKey: 'unit.orc.grunt',
    description: 'Brutish orc warrior wielding a heavy axe.',
  }),
  createOrcUnit({
    id: 'orc_wolf_rider',
    name: 'Wolf Rider',
    tier: UnitTier.TIER_2,
    spriteKey: 'unit.orc.wolf_rider',
    description: 'Swift mounted raider on a fearsome war wolf.',
  }),
  createOrcUnit({
    id: 'orc_troll',
    name: 'Troll',
    tier: UnitTier.TIER_3,
    spriteKey: 'unit.orc.troll',
    description: 'Regenerating berserker hurling crude spears.',
  }),
  createOrcUnit({
    id: 'orc_headhunter',
    name: 'Headhunter',
    tier: UnitTier.TIER_4,
    spriteKey: 'unit.orc.headhunter',
    description: 'Elite troll warrior seeking trophies from the fallen.',
  }),
];

export function getOrcUnitsByTier(tier: UnitTier): UnitConfig[] {
  return orcUnits.filter((unit) => unit.tier === tier);
}
