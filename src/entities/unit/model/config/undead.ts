import { Faction, UnitTier, type UnitConfig } from '../types';
import { UNIT_SPRITE_KEYS } from '../../../../shared/constants/sprites';

const TIER_HEALTH_BASE = 110;
const TIER_HEALTH_STEP = 85;
const TIER_SPEED_BASE = 1.34;
const TIER_SPEED_STEP = 0.09;
const TIER_ARMOR_BASE = 0;
const TIER_ARMOR_STEP = 1;
const TIER_DAMAGE_BASE = 12;
const TIER_DAMAGE_STEP = 8;
const TIER_REWARD_BASE = 6;
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

type UndeadUnitSeed = Pick<UnitConfig, 'id' | 'name' | 'tier' | 'spriteKey' | 'description'>;

function createUndeadUnit(seed: UndeadUnitSeed): UnitConfig {
  return {
    id: seed.id,
    name: seed.name,
    faction: Faction.UNDEAD,
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

export const undeadUnits: UnitConfig[] = [
  createUndeadUnit({
    id: 'undead_skeleton',
    name: 'Skeleton',
    tier: UnitTier.TIER_1,
    spriteKey: UNIT_SPRITE_KEYS.UNDEAD_SKELETON,
    description: 'Restless bones marching from forgotten crypts.',
  }),
  createUndeadUnit({
    id: 'undead_ghoul',
    name: 'Ghoul',
    tier: UnitTier.TIER_1,
    spriteKey: UNIT_SPRITE_KEYS.UNDEAD_GHOUL,
    description: 'Feral clawed scavenger that thrives in the dark.',
  }),
  createUndeadUnit({
    id: 'undead_crypt_fiend',
    name: 'Crypt Fiend',
    tier: UnitTier.TIER_2,
    spriteKey: 'unit.undead.crypt_fiend',
    description: 'A spider-like horror wrapped in deathly chitin.',
  }),
  createUndeadUnit({
    id: 'undead_gargoyle',
    name: 'Gargoyle',
    tier: UnitTier.TIER_3,
    spriteKey: 'unit.undead.gargoyle',
    description: 'Winged stone predator animated by necrotic will.',
  }),
  createUndeadUnit({
    id: 'undead_abomination',
    name: 'Abomination',
    tier: UnitTier.TIER_4,
    spriteKey: 'unit.undead.abomination',
    description: 'Patchworked brute stitched for siege and terror.',
  }),
  createUndeadUnit({
    id: 'undead_necromancer',
    name: 'Necromancer',
    tier: UnitTier.TIER_5,
    spriteKey: 'unit.undead.necromancer',
    description: 'Dark acolyte channeling grave-born sorcery.',
  }),
  createUndeadUnit({
    id: 'undead_banshee',
    name: 'Banshee',
    tier: UnitTier.TIER_5,
    spriteKey: 'unit.undead.banshee',
    description: 'Wailing spirit drifting between life and oblivion.',
  }),
  createUndeadUnit({
    id: 'undead_frost_wyrm',
    name: 'Frost Wyrm',
    tier: UnitTier.TIER_6,
    spriteKey: 'unit.undead.frost_wyrm',
    description: 'Ancient dragon bound to ice and undeath.',
  }),
];

export function getUnitsByTier(tier: UnitTier): UnitConfig[] {
  return undeadUnits.filter((unit) => unit.tier === tier);
}
