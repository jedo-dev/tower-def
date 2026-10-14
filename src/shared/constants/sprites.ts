import { RaceId } from '../types/content-ids';
import skeletonSprite from '../sprite/skeleton.svg';
import orcGruntSprite from '../sprite/orc_grunt.png';
import orcWolfRiderSprite from '../sprite/orc_wolf_rider.png';
import orcTrollSprite from '../sprite/orc_troll.png';
import orcHeadhunterSprite from '../sprite/orc_headhunter.png';
import ghoulSprite from '../sprite/ghoul.svg';
import cryptFiendSprite from '../sprite/undead_crypt_fiend.svg';
import gargoyleSprite from '../sprite/undead_gargoyle.svg';

export const UNIT_SPRITE_KEYS = {
  UNDEAD_SKELETON: 'unit.undead.skeleton',
  UNDEAD_GHOUL: 'unit.undead.ghoul',
  UNDEAD_CRYPT_FIEND: 'unit.undead.crypt_fiend',
  UNDEAD_GARGOYLE: 'unit.undead.gargoyle',
  ORC_GRUNT: 'unit.orc.grunt',
  ORC_WOLF_RIDER: 'unit.orc.wolf_rider',
  ORC_TROLL: 'unit.orc.troll',
  ORC_HEADHUNTER: 'unit.orc.headhunter',
} as const;

export const UNIT_SPRITE_ASSETS: Record<
  (typeof UNIT_SPRITE_KEYS)[keyof typeof UNIT_SPRITE_KEYS],
  string
> = {
  [UNIT_SPRITE_KEYS.UNDEAD_SKELETON]: skeletonSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_GHOUL]: ghoulSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND]: cryptFiendSprite,
  [UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE]: gargoyleSprite,
  [UNIT_SPRITE_KEYS.ORC_GRUNT]: orcGruntSprite,
  [UNIT_SPRITE_KEYS.ORC_WOLF_RIDER]: orcWolfRiderSprite,
  [UNIT_SPRITE_KEYS.ORC_TROLL]: orcTrollSprite,
  [UNIT_SPRITE_KEYS.ORC_HEADHUNTER]: orcHeadhunterSprite,
};

/**
 * Creeps whose own sheet is registered, keyed by unit id. Lives in shared so
 * both the Phaser battlefield and the HUD resolve art the same way; the ids are
 * plain strings because `shared` sits below `entities`.
 */
export const UNIT_SPRITE_KEY_BY_UNIT_ID: Record<string, string> = {
  undead_skeleton: UNIT_SPRITE_KEYS.UNDEAD_SKELETON,
  undead_ghoul: UNIT_SPRITE_KEYS.UNDEAD_GHOUL,
  undead_crypt_fiend: UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND,
  undead_gargoyle: UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE,
  orc_grunt: UNIT_SPRITE_KEYS.ORC_GRUNT,
  orc_wolf_rider: UNIT_SPRITE_KEYS.ORC_WOLF_RIDER,
  orc_troll: UNIT_SPRITE_KEYS.ORC_TROLL,
  orc_headhunter: UNIT_SPRITE_KEYS.ORC_HEADHUNTER,
};

/**
 * Sheet shape in frames. Phaser reads it from the frame size, but CSS cannot:
 * an HTML icon needs the grid up front to place a single frame.
 */
export type UnitSpriteSheetLayout = {
  columns: number;
  rows: number;
};

const LEGACY_STRIP_LAYOUT: UnitSpriteSheetLayout = { columns: 4, rows: 1 };
const DIRECTIONAL_SHEET_LAYOUT: UnitSpriteSheetLayout = { columns: 4, rows: 4 };

export const UNIT_SPRITE_SHEET_LAYOUTS: Record<string, UnitSpriteSheetLayout> = {
  [UNIT_SPRITE_KEYS.UNDEAD_SKELETON]: LEGACY_STRIP_LAYOUT,
  [UNIT_SPRITE_KEYS.UNDEAD_GHOUL]: LEGACY_STRIP_LAYOUT,
  [UNIT_SPRITE_KEYS.UNDEAD_CRYPT_FIEND]: LEGACY_STRIP_LAYOUT,
  [UNIT_SPRITE_KEYS.UNDEAD_GARGOYLE]: LEGACY_STRIP_LAYOUT,
  [UNIT_SPRITE_KEYS.ORC_GRUNT]: DIRECTIONAL_SHEET_LAYOUT,
  [UNIT_SPRITE_KEYS.ORC_WOLF_RIDER]: DIRECTIONAL_SHEET_LAYOUT,
  [UNIT_SPRITE_KEYS.ORC_TROLL]: DIRECTIONAL_SHEET_LAYOUT,
  [UNIT_SPRITE_KEYS.ORC_HEADHUNTER]: DIRECTIONAL_SHEET_LAYOUT,
};

export type UnitSpriteSheet = {
  spriteKey: string;
  url: string;
  layout: UnitSpriteSheetLayout;
};

/** The portrait frame: first step of the walk that faces the camera. */
export function tryResolveUnitSpriteSheet(unitId: string): UnitSpriteSheet | null {
  const spriteKey = UNIT_SPRITE_KEY_BY_UNIT_ID[unitId];
  if (!spriteKey) {
    return null;
  }

  const url = UNIT_SPRITE_ASSETS[spriteKey as keyof typeof UNIT_SPRITE_ASSETS];
  const layout = UNIT_SPRITE_SHEET_LAYOUTS[spriteKey];
  if (!url || !layout) {
    return null;
  }

  return { spriteKey, url, layout };
}

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

/**
 * Rows of the 128x128 creep sheet, in the order Phaser numbers frames
 * (left to right, top row first). A sheet with fewer frames is the legacy
 * 128x32 strip: one side-view walk, no directions and no death.
 */
export const UNIT_SHEET_ROWS = {
  WALK_DOWN: 0,
  WALK_SIDE: 1,
  WALK_UP: 2,
  DEATH: 3,
} as const;

export const UNIT_SHEET_FRAMES_PER_ROW = 4;
export const UNIT_DIRECTIONAL_FRAME_COUNT = UNIT_SHEET_FRAMES_PER_ROW * 4;

export const UnitAnimationKind = {
  WALK_DOWN: 'walk.down',
  WALK_SIDE: 'walk.side',
  WALK_UP: 'walk.up',
  DEATH: 'death',
} as const;

export type UnitAnimationKind = (typeof UnitAnimationKind)[keyof typeof UnitAnimationKind];

/** Animation keys are derived from the sprite key, so a new creep needs no new constant. */
export function toUnitAnimationKey(spriteKey: string, kind: UnitAnimationKind): string {
  return `${spriteKey}.${kind}`;
}

export const TOWER_SPRITE_KEYS = {
  UNDEAD_BONE_ARCHER: 'tower.undead.bone_archer',
  ELF_MOON_ARCHER: 'tower.elf.moon_archer',
} as const;

export type TowerSpriteKey = (typeof TOWER_SPRITE_KEYS)[keyof typeof TOWER_SPRITE_KEYS];

export const TOWER_SPRITE_ASSETS: Record<TowerSpriteKey, string> = {
  [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]: '/assets/towers/undead_bone_archer.svg',
  [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER]: '/assets/towers/elf_moon_archer.png',
};

export const TOWER_SPRITE_SHEET_FRAME = {
  width: 60,
  height: 60,
} as const;

/** Every tower sheet is 300x180: five 60px frames across, three rows down. */
export const TOWER_SPRITE_SHEET_LAYOUT = {
  columns: 5,
  rows: 3,
} as const;

export type TowerSpriteSheet = {
  spriteKey: TowerSpriteKey;
  url: string;
  layout: typeof TOWER_SPRITE_SHEET_LAYOUT;
  /** Frame the HTML portrait shows: the first idle pose. */
  portraitFrame: number;
};

function isTowerSpriteKey(spriteKey: string): spriteKey is TowerSpriteKey {
  return spriteKey in TOWER_SPRITE_ASSETS;
}

/** The portrait frame of a tower sheet; null while the tower has no art. */
export function tryResolveTowerSpriteSheet(spriteKey: string): TowerSpriteSheet | null {
  if (!isTowerSpriteKey(spriteKey)) {
    return null;
  }

  return {
    spriteKey,
    url: TOWER_SPRITE_ASSETS[spriteKey],
    layout: TOWER_SPRITE_SHEET_LAYOUT,
    portraitFrame: TOWER_SHEET_FRAME_LAYOUTS[spriteKey].idle[0],
  };
}

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

/**
 * Frame slots a tower sheet draws its animations in. `hitReaction` is null
 * when the sheet has no hit-reaction pose; the animation then reuses the first
 * idle frame instead of showing an empty slot.
 */
export type TowerSheetFrameLayout = {
  build: readonly number[];
  idle: readonly number[];
  attack: readonly number[];
  hitReaction: readonly number[] | null;
  sell: readonly number[];
};

/** The tower sheet contract from docs/08: slots 8 and 14 stay empty. */
export const TOWER_SHEET_CONTRACT_FRAMES: TowerSheetFrameLayout = {
  build: [0, 1, 2],
  idle: [3, 4],
  attack: [5, 6, 7],
  hitReaction: [9],
  sell: [10, 11],
};

/** Per-sheet deviations from the contract, checked against the shipped art. */
export const TOWER_SHEET_FRAME_LAYOUTS: Record<TowerSpriteKey, TowerSheetFrameLayout> = {
  // Legacy sheet: the hit-reaction pose sits in slot 8, slots 9 and 14 are empty.
  [TOWER_SPRITE_KEYS.UNDEAD_BONE_ARCHER]: { ...TOWER_SHEET_CONTRACT_FRAMES, hitReaction: [8] },
  // Slots 8, 9 and 14 are empty: no hit-reaction pose was drawn.
  [TOWER_SPRITE_KEYS.ELF_MOON_ARCHER]: { ...TOWER_SHEET_CONTRACT_FRAMES, hitReaction: null },
};

export const TOWER_BONE_ARCHER_EFFECT_FRAMES = {
  projectile: 12,
  attackEffect: 13,
} as const;

export const PLACEHOLDER_ANIMATION_KEYS = {
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
