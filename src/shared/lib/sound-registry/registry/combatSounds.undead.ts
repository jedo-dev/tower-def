import type { UndeadSoundId } from '../../../types/sound-ids';
import type { SoundClipDefinition } from '../audio.types';
import { ATTACK, BUILD, CREEP_DEATH, HEAVY_ATTACK, IMPACT, raceCombatClip } from './combatPlayback';

const clip = raceCombatClip.bind(null, 'undead');

export const UNDEAD_COMBAT_SOUND_CLIPS: Record<UndeadSoundId, SoundClipDefinition> = {
  'combat.attack.single.undead': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.undead': clip('attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.undead': clip('attack_frost.wav', ATTACK),
  'combat.impact.undead': clip('impact.wav', IMPACT),
  'combat.build.undead': clip('build.wav', BUILD),
  'combat.creep_death.undead': clip('creep_death.wav', CREEP_DEATH),
};
