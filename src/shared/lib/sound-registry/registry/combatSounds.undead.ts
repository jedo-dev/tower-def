import type { UndeadSoundId } from '../../../types/sound-ids';
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

const clip = raceCombatClip.bind(null, 'undead');

export const UNDEAD_COMBAT_SOUND_CLIPS: Record<UndeadSoundId, SoundClipDefinition> = {
  'combat.attack.single.undead': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.undead': clip('attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.undead': clip('attack_frost.wav', ATTACK),
  'combat.impact.undead': clip('impact.wav', IMPACT),
  'combat.build.undead': clip('build.wav', BUILD),
  'combat.creep_death.undead': clip('creep_death.wav', CREEP_DEATH),

  'combat.creep.undead_skeleton.hit': clip('creeps/undead_skeleton_hit.wav', CREEP_HIT),
  'combat.creep.undead_skeleton.death': clip('creeps/undead_skeleton_death.wav', CREEP_DEATH),
  'combat.creep.undead_skeleton.escape': clip('creeps/undead_skeleton_escape.wav', CREEP_ESCAPE),
  'combat.creep.undead_skeleton.spawn': clip('creeps/undead_skeleton_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_ghoul.hit': clip('creeps/undead_ghoul_hit.wav', CREEP_HIT),
  'combat.creep.undead_ghoul.death': clip('creeps/undead_ghoul_death.wav', CREEP_DEATH),
  'combat.creep.undead_ghoul.escape': clip('creeps/undead_ghoul_escape.wav', CREEP_ESCAPE),
  'combat.creep.undead_ghoul.spawn': clip('creeps/undead_ghoul_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_crypt_fiend.hit': clip('creeps/undead_crypt_fiend_hit.wav', CREEP_HIT),
  'combat.creep.undead_crypt_fiend.death': clip('creeps/undead_crypt_fiend_death.wav', CREEP_DEATH),
  'combat.creep.undead_crypt_fiend.escape': clip(
    'creeps/undead_crypt_fiend_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.undead_crypt_fiend.spawn': clip('creeps/undead_crypt_fiend_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_gargoyle.hit': clip('creeps/undead_gargoyle_hit.wav', CREEP_HIT),
  'combat.creep.undead_gargoyle.death': clip('creeps/undead_gargoyle_death.wav', CREEP_DEATH),
  'combat.creep.undead_gargoyle.escape': clip('creeps/undead_gargoyle_escape.wav', CREEP_ESCAPE),
  'combat.creep.undead_gargoyle.spawn': clip('creeps/undead_gargoyle_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_abomination.hit': clip('creeps/undead_abomination_hit.wav', CREEP_HIT),
  'combat.creep.undead_abomination.death': clip('creeps/undead_abomination_death.wav', CREEP_DEATH),
  'combat.creep.undead_abomination.escape': clip(
    'creeps/undead_abomination_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.undead_abomination.spawn': clip('creeps/undead_abomination_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_necromancer.hit': clip('creeps/undead_necromancer_hit.wav', CREEP_HIT),
  'combat.creep.undead_necromancer.death': clip('creeps/undead_necromancer_death.wav', CREEP_DEATH),
  'combat.creep.undead_necromancer.escape': clip(
    'creeps/undead_necromancer_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.undead_necromancer.spawn': clip('creeps/undead_necromancer_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_banshee.hit': clip('creeps/undead_banshee_hit.wav', CREEP_HIT),
  'combat.creep.undead_banshee.death': clip('creeps/undead_banshee_death.wav', CREEP_DEATH),
  'combat.creep.undead_banshee.escape': clip('creeps/undead_banshee_escape.wav', CREEP_ESCAPE),
  'combat.creep.undead_banshee.spawn': clip('creeps/undead_banshee_spawn.wav', CREEP_SPAWN),

  'combat.creep.undead_frost_wyrm.hit': clip('creeps/undead_frost_wyrm_hit.wav', CREEP_HIT),
  'combat.creep.undead_frost_wyrm.death': clip('creeps/undead_frost_wyrm_death.wav', CREEP_DEATH),
  'combat.creep.undead_frost_wyrm.escape': clip(
    'creeps/undead_frost_wyrm_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.undead_frost_wyrm.spawn': clip('creeps/undead_frost_wyrm_spawn.wav', CREEP_SPAWN),

  'combat.tower.undead_bone_archer_tower.attack': clip(
    'towers/undead_bone_archer_tower_attack.wav',
    ATTACK,
  ),
  'combat.tower.undead_bone_archer_tower.impact': clip(
    'towers/undead_bone_archer_tower_impact.wav',
    IMPACT,
  ),
  'combat.tower.undead_plague_tower.attack': clip(
    'towers/undead_plague_tower_attack.wav',
    HEAVY_ATTACK,
  ),
  'combat.tower.undead_plague_tower.impact': clip('towers/undead_plague_tower_impact.wav', IMPACT),
  'combat.tower.undead_frost_wyrm_nest.attack': clip(
    'towers/undead_frost_wyrm_nest_attack.wav',
    ATTACK,
  ),
  'combat.tower.undead_frost_wyrm_nest.impact': clip(
    'towers/undead_frost_wyrm_nest_impact.wav',
    IMPACT,
  ),
  'combat.tower.undead_bone_obelisk.attack': clip('towers/undead_bone_obelisk_attack.wav', ATTACK),
  'combat.tower.undead_bone_obelisk.impact': clip('towers/undead_bone_obelisk_impact.wav', IMPACT),
};
