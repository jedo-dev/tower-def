import { RaceId } from '../types/content-ids';
import skeletonSprite from '../sprite/skeleton.svg';
import ghoulSprite from '../sprite/ghoul.svg';
import cryptFiendSprite from '../sprite/undead_crypt_fiend.svg';
import gargoyleSprite from '../sprite/undead_gargoyle.svg';

export const UNIT_SPRITE_KEYS = {
  UNDEAD_SKELETON: 'unit.undead.skeleton',
  UNDEAD_GHOUL: 'unit.undead.ghoul',
  UNDEAD_CRYPT_FIEND: 'unit.undead.crypt_fiend',
  UNDEAD_GARGOYLE: 'unit.undead.gargoyle',
} as const;

export const UNIT_SPRITE_ASSETS: Record<(typeof UNIT_SPRITE_KEYS)[keyof typeof UNIT_SPRITE_KEYS], string> = {
  [UNIT_SPRITE_KEYS.UNDEAD_SKELETON]: skeletonSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_GHOUL]: ghoulSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND]: cryptFiendSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE]: gargoyleSprite,
};

// Dedicated art exists only for undead units; other factions reuse the undead
// sheets with a faction tint until per-race sprites land.
export const UNIT_FACTION_TINTS: Record<RaceId, number> = {
  [RaceId.UNDEAD]: 0xffffff,
  [RaceId.ORC]: 0x8fce6a,
  [RaceId.HUMAN]: 0xf2d38b,
  [RaceId.ELF]: 0x9bdcd6,
};

export const UNIT_SPRITE_SHEET_FRAME = {
  width: 32,
  height: 32,
} as const;

export const UNIT_ANIMATION_KEYS = {
  UNDEAD_SKELETON_WALK: 'unit.undead.skeleton.walk',
  UNDEAD_GHOUL_WALK: 'unit.undead.ghoul.walk',
  UNDEAD_CRYPT_FIEND_WALK: 'unit.undead.crypt_fiend.walk',
  UNDEAD_GARGOYLE_WALK: 'unit.undead.gargoyle.walk',
} as const;

export const TOWER_SPRITE_KEYS = {
  UNDEAD_BONE_ARCHER: 'tower.undead.bone_archer',
  ELF_MOON_ARCHER: 'tower.elf.moon_archer',
} as const;

export const TOWER_SPRITE_ASSETS: Record<(typeof TOWER_SPRITE_KEYS)[keyof typeof TOWER_SPRITE_KEYS], string> = {
  [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]: '/assets/towers/undead_bone_archer.svg',
  [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER]: '/assets/towers/elf_moon_archer.png',
};

export const TOWER_SPRITE_SHEET_FRAME = {
  width: 60,
  height: 60,
} as const;

export const TOWER_ANIMATION_KEYS = {
  UNDEAD_BONE_ARCHER_BUILD: 'tower.undead.bone_archer.build',
  UNDEAD_BONE_ARCHER_IDLE: 'tower.undead.bone_archer.idle',
  UNDEAD_BONE_ARCHER_ATTACK: 'tower.undead.bone_archer.attack',
  UNDEAD_BONE_ARCHER_HIT_REACTION: 'tower.undead.bone_archer.hitReaction',
  UNDEAD_BONE_ARCHER_SELL: 'tower.undead.bone_archer.sell',
  ELF_MOON_ARCHER_BUILD: 'tower.elf.moon_archer.build',
  ELF_MOON_ARCHER_IDLE: 'tower.elf.moon_archer.idle',
  ELF_MOON_ARCHER_ATTACK: 'tower.elf.moon_archer.attack',
  ELF_MOON_ARCHER_HIT_REACTION: 'tower.elf.moon_archer.hitReaction',
  ELF_MOON_ARCHER_SELL: 'tower.elf.moon_archer.sell',
} as const;

export const TOWER_BONE_ARCHER_ANIMATION_FRAMES = {
  build: [0, 1, 2],
  idle: [3, 4],
  attack: [5, 6, 7],
  hitReaction: [9],
  sell: [10, 11],
} as const;

export const TOWER_BONE_ARCHER_EFFECT_FRAMES = {
  projectile: 12,
  attackEffect: 13,
} as const;

export const PLACEHOLDER_ANIMATION_KEYS = {
  UNIT_WALK: 'placeholder.unit.walk',
  TOWER_BUILD: 'placeholder.tower.build',
  TOWER_IDLE: 'placeholder.tower.idle',
  TOWER_ATTACK: 'placeholder.tower.attack',
  TOWER_HIT_REACTION: 'placeholder.tower.hitReaction',
  TOWER_SELL: 'placeholder.tower.sell',
} as const;

export const TOWER_ANIMATION_SETS = {
  [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]: {
    build: TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_BUILD,
    idle: TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_IDLE,
    attack: TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_ATTACK,
    hitReaction: TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_HIT_REACTION,
    sell: TOWER_ANIMATION_KEYS.UNDEAD_BONE_ARCHER_SELL,
  },
  [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER]: {
    build: TOWER_ANIMATION_KEYS.ELF_MOON_ARCHER_BUILD,
    idle: TOWER_ANIMATION_KEYS.ELF_MOON_ARCHER_IDLE,
    attack: TOWER_ANIMATION_KEYS.ELF_MOON_ARCHER_ATTACK,
    hitReaction: TOWER_ANIMATION_KEYS.ELF_MOON_ARCHER_HIT_REACTION,
    sell: TOWER_ANIMATION_KEYS.ELF_MOON_ARCHER_SELL,
  },
} as const;
