import type { CoreSoundId } from './core';
import type { ElfSoundId } from './elf';
import type { HumanSoundId } from './human';
import type { OrcSoundId } from './orc';
import type { UndeadSoundId } from './undead';

type AnySoundId = CoreSoundId | UndeadSoundId | OrcSoundId | HumanSoundId | ElfSoundId;

/** What a tower can sound like; resolved tower -> archetype -> race -> default. */
export const TowerSoundSlot = {
  ATTACK: 'attack',
  IMPACT: 'impact',
  BUILD: 'build',
  SELL: 'sell',
  UPGRADE: 'upgrade',
} as const;

export type TowerSoundSlot = (typeof TowerSoundSlot)[keyof typeof TowerSoundSlot];

export const TOWER_SOUND_SLOTS: readonly TowerSoundSlot[] = [
  TowerSoundSlot.ATTACK,
  TowerSoundSlot.IMPACT,
  TowerSoundSlot.BUILD,
  TowerSoundSlot.SELL,
  TowerSoundSlot.UPGRADE,
] as const;

/** What a creature sounds like; resolved creature -> race -> default. */
export const CreepSoundSlot = {
  HIT: 'creepHit',
  DEATH: 'creepDeath',
  ESCAPE: 'creepEscape',
  /** A sent creature entering the receiving board; baseline wave creeps are silent. */
  SPAWN: 'creepSpawn',
} as const;

export type CreepSoundSlot = (typeof CreepSoundSlot)[keyof typeof CreepSoundSlot];

export const CREEP_SOUND_SLOTS: readonly CreepSoundSlot[] = [
  CreepSoundSlot.HIT,
  CreepSoundSlot.DEATH,
  CreepSoundSlot.ESCAPE,
  CreepSoundSlot.SPAWN,
] as const;

export type SoundSlot = TowerSoundSlot | CreepSoundSlot;

export const SOUND_SLOTS: readonly SoundSlot[] = [...TOWER_SOUND_SLOTS, ...CREEP_SOUND_SLOTS];

/** Sounds a single tower may override in its own content entry. */
export type TowerSoundSet = Partial<Record<TowerSoundSlot, AnySoundId>>;

/** Sounds a single creature may override in its own content entry. */
export type CreepSoundSet = Partial<Record<CreepSoundSlot, AnySoundId>>;

/** Sounds a race profile may set for all of its towers and creatures. */
export type SoundSlotSet = Partial<Record<SoundSlot, AnySoundId>>;
