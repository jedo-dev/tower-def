import type { HumanSoundId } from '../../../types/sound-ids';
import type { SoundClipDefinition } from '../audio.types';
import { ATTACK, BUILD, CREEP_DEATH, HEAVY_ATTACK, IMPACT, raceCombatClip } from './combatPlayback';

const clip = raceCombatClip.bind(null, 'human');

export const HUMAN_COMBAT_SOUND_CLIPS: Record<HumanSoundId, SoundClipDefinition> = {
  'combat.attack.single.human': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.human': clip('attack_splash.wav', { ...HEAVY_ATTACK, volume: 0.26 }),
  'combat.attack.poison.human': clip('attack_poison.wav', ATTACK),
  'combat.impact.human': clip('impact.wav', IMPACT),
  'combat.build.human': clip('build.wav', BUILD),
  'combat.creep_death.human': clip('creep_death.wav', CREEP_DEATH),
};
