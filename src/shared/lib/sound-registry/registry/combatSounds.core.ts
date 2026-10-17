import type { CoreSoundId } from '../../../types/sound-ids';
import type { SoundClipDefinition } from '../audio.types';
import {
  ATTACK,
  BUILD,
  CREEP_DEATH,
  CREEP_ESCAPE,
  CREEP_HIT,
  CREEP_SPAWN,
  EFFECT,
  IMPACT,
  UPGRADE,
  combatClip,
} from './combatPlayback';

type CoreCombatSoundId = Extract<CoreSoundId, `combat.${string}`>;

/** Fallback clips (default profile) and race-neutral status effect stingers. */
export const CORE_COMBAT_SOUND_CLIPS: Record<CoreCombatSoundId, SoundClipDefinition> = {
  'combat.attack.default': combatClip('default/attack.wav', ATTACK),
  'combat.impact.default': combatClip('default/impact.wav', IMPACT),
  'combat.build': combatClip('default/build.wav', BUILD),
  'combat.sell': combatClip('default/sell.wav', { ...BUILD, volume: 0.26 }),
  'combat.upgrade': combatClip('default/upgrade.wav', UPGRADE),
  'combat.creep_hit': combatClip('default/creep_hit.wav', CREEP_HIT),
  'combat.creep_death': combatClip('default/creep_death.wav', CREEP_DEATH),
  'combat.creep_escape': combatClip('default/creep_escape.wav', CREEP_ESCAPE),
  'combat.creep_spawn': combatClip('default/creep_spawn.wav', CREEP_SPAWN),
  'combat.effect_applied.chill': combatClip('effects/chill.wav', EFFECT),
  'combat.effect_applied.poison': combatClip('effects/poison.wav', EFFECT),
  'combat.effect_applied.stun': combatClip('effects/stun.wav', { ...EFFECT, volume: 0.24 }),
};
