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
