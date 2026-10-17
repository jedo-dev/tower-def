import type { ElfSoundId } from '../../../types/sound-ids';
import type { SoundClipDefinition } from '../audio.types';
import { ATTACK, BUILD, CREEP_DEATH, HEAVY_ATTACK, IMPACT, raceCombatClip } from './combatPlayback';

const clip = raceCombatClip.bind(null, 'elf');

export const ELF_COMBAT_SOUND_CLIPS: Record<ElfSoundId, SoundClipDefinition> = {
  'combat.attack.single.elf': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.elf': clip('attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.elf': clip('attack_frost.wav', ATTACK),
  'combat.attack.poison.elf': clip('attack_poison.wav', ATTACK),
  'combat.impact.elf': clip('impact.wav', IMPACT),
  'combat.build.elf': clip('build.wav', BUILD),
  'combat.creep_death.elf': clip('creep_death.wav', CREEP_DEATH),
};
