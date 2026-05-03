import skeletonSprite from '../sprite/skeleton.svg';
import ghoulSprite from '../sprite/ghoul.svg';

export const UNIT_SPRITE_KEYS = {
  UNDEAD_SKELETON: 'unit.undead.skeleton',
  UNDEAD_GHOUL: 'unit.undead.ghoul',
} as const;

export const UNIT_SPRITE_ASSETS: Record<(typeof UNIT_SPRITE_KEYS)[keyof typeof UNIT_SPRITE_KEYS], string> = {
  [UNIT_SPRITE_KEYS.UNDEAD_SKELETON]: skeletonSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_GHOUL]: ghoulSprite,
};

export const UNIT_SPRITE_SHEET_FRAME = {
  width: 32,
  height: 32,
} as const;

export const UNIT_ANIMATION_KEYS = {
  UNDEAD_SKELETON_WALK: 'unit.undead.skeleton.walk',
  UNDEAD_GHOUL_WALK: 'unit.undead.ghoul.walk',
} as const;
