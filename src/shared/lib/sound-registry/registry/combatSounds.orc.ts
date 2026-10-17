import type { OrcSoundId } from '../../../types/sound-ids';
import type { SoundClipDefinition } from '../audio.types';
import {
  ATTACK,
  BUILD,
  CREEP_DEATH,
  CREEP_ESCAPE,
  CREEP_HIT,
  CREEP_SPAWN,
  HEAVY_ATTACK,
  IMPACT,
  raceCombatClip,
} from './combatPlayback';

const clip = raceCombatClip.bind(null, 'orc');

export const ORC_COMBAT_SOUND_CLIPS: Record<OrcSoundId, SoundClipDefinition> = {
  'combat.attack.single.orc': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.orc': clip('attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.chain.orc': clip('attack_chain.wav', ATTACK),
  'combat.attack.frost.orc': clip('attack_frost.wav', ATTACK),
  'combat.impact.orc': clip('impact.wav', IMPACT),
  'combat.build.orc': clip('build.wav', BUILD),
  'combat.creep_death.orc': clip('creep_death.wav', CREEP_DEATH),

  'combat.creep.orc_grunt.hit': clip('creeps/orc_grunt_hit.wav', CREEP_HIT),
  'combat.creep.orc_grunt.death': clip('creeps/orc_grunt_death.wav', CREEP_DEATH),
  'combat.creep.orc_grunt.escape': clip('creeps/orc_grunt_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_grunt.spawn': clip('creeps/orc_grunt_spawn.wav', CREEP_SPAWN),

  'combat.tower.orc_spear_watchtower.attack': clip(
    'towers/orc_spear_watchtower_attack.wav',
    ATTACK,
  ),
  'combat.tower.orc_spear_watchtower.impact': clip(
    'towers/orc_spear_watchtower_impact.wav',
    IMPACT,
  ),
};
