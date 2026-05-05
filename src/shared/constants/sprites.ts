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
} as const;

export const TOWER_SPRITE_ASSETS: Record<(typeof TOWER_SPRITE_KEYS)[keyof typeof TOWER_SPRITE_KEYS], string> = {
  [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]: '/assets/towers/undead_bone_archer.svg',
};

export const TOWER_SPRITE_SHEET_FRAME = {
  width: 32,
  height: 32,
} as const;

export const TOWER_ANIMATION_KEYS = {
  UNDEAD_BONE_ARCHER_BUILD: 'tower.undead.bone_archer.build',
  UNDEAD_BONE_ARCHER_IDLE: 'tower.undead.bone_archer.idle',
  UNDEAD_BONE_ARCHER_ATTACK: 'tower.undead.bone_archer.attack',
  UNDEAD_BONE_ARCHER_HIT_REACTION: 'tower.undead.bone_archer.hitReaction',
  UNDEAD_BONE_ARCHER_SELL: 'tower.undead.bone_archer.sell',
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
