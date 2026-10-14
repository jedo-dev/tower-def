/**
 * Sound vocabulary shared by content validation and the audio runtime.
 *
 * A `SoundId` names exactly one clip, and every clip has its own file
 * (`SOUND_ASSET_PATHS`): two ids never share a file. When two races or towers
 * should sound alike, their sound profiles (`src/content/audio`) point at the
 * same id instead, so the sharing is explicit and visible in content.
 */
export const SOUND_IDS = [
  'ui.click',
  'ui.hover',
  'ui.open',
  'ui.close',
  'ui.error',
  'ui.success',
  'ui.build_select',
  'ui.faction_select',
  'ui.wave_start',
  'ui.wave_complete',
  'ui.game_over',
  'ui.victory',
  'system.pause',
  'system.unpause',
  'system.restart',
  'economy.gold_gain',
  'economy.gold_spent',
  'economy.refund',
  'economy.life_lost',
  'economy.wave_reward',
  'combat.attack.archer',
  'combat.attack.splash',
  'combat.creep_hit',
  'combat.effect_applied.chill',
  'combat.effect_applied.poison',
  'combat.effect_applied.stun',
  'ambient.map',
  'ambient.tension',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

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

/** What a creature sounds like; resolved by the creature's own race -> default. */
export const CreepSoundSlot = {
  HIT: 'creepHit',
  DEATH: 'creepDeath',
  ESCAPE: 'creepEscape',
} as const;

export type CreepSoundSlot = (typeof CreepSoundSlot)[keyof typeof CreepSoundSlot];

export const CREEP_SOUND_SLOTS: readonly CreepSoundSlot[] = [
  CreepSoundSlot.HIT,
  CreepSoundSlot.DEATH,
  CreepSoundSlot.ESCAPE,
] as const;

export type SoundSlot = TowerSoundSlot | CreepSoundSlot;

export const SOUND_SLOTS: readonly SoundSlot[] = [...TOWER_SOUND_SLOTS, ...CREEP_SOUND_SLOTS];

/** Sounds a single tower may override in its own content entry. */
export type TowerSoundSet = Partial<Record<TowerSoundSlot, SoundId>>;

/** Sounds a race profile may set for all of its towers and creatures. */
export type SoundSlotSet = Partial<Record<SoundSlot, SoundId>>;
