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

  'combat.creep.orc_peon.hit': clip('creeps/orc_peon_hit.wav', CREEP_HIT),
  'combat.creep.orc_peon.death': clip('creeps/orc_peon_death.wav', CREEP_DEATH),
  'combat.creep.orc_peon.escape': clip('creeps/orc_peon_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_peon.spawn': clip('creeps/orc_peon_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_wolf_rider.hit': clip('creeps/orc_wolf_rider_hit.wav', CREEP_HIT),
  'combat.creep.orc_wolf_rider.death': clip('creeps/orc_wolf_rider_death.wav', CREEP_DEATH),
  'combat.creep.orc_wolf_rider.escape': clip('creeps/orc_wolf_rider_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_wolf_rider.spawn': clip('creeps/orc_wolf_rider_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_troll.hit': clip('creeps/orc_troll_hit.wav', CREEP_HIT),
  'combat.creep.orc_troll.death': clip('creeps/orc_troll_death.wav', CREEP_DEATH),
  'combat.creep.orc_troll.escape': clip('creeps/orc_troll_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_troll.spawn': clip('creeps/orc_troll_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_headhunter.hit': clip('creeps/orc_headhunter_hit.wav', CREEP_HIT),
  'combat.creep.orc_headhunter.death': clip('creeps/orc_headhunter_death.wav', CREEP_DEATH),
  'combat.creep.orc_headhunter.escape': clip('creeps/orc_headhunter_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_headhunter.spawn': clip('creeps/orc_headhunter_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_shaman.hit': clip('creeps/orc_shaman_hit.wav', CREEP_HIT),
  'combat.creep.orc_shaman.death': clip('creeps/orc_shaman_death.wav', CREEP_DEATH),
  'combat.creep.orc_shaman.escape': clip('creeps/orc_shaman_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_shaman.spawn': clip('creeps/orc_shaman_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_wind_rider.hit': clip('creeps/orc_wind_rider_hit.wav', CREEP_HIT),
  'combat.creep.orc_wind_rider.death': clip('creeps/orc_wind_rider_death.wav', CREEP_DEATH),
  'combat.creep.orc_wind_rider.escape': clip('creeps/orc_wind_rider_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_wind_rider.spawn': clip('creeps/orc_wind_rider_spawn.wav', CREEP_SPAWN),

  'combat.creep.orc_tauren.hit': clip('creeps/orc_tauren_hit.wav', CREEP_HIT),
  'combat.creep.orc_tauren.death': clip('creeps/orc_tauren_death.wav', CREEP_DEATH),
  'combat.creep.orc_tauren.escape': clip('creeps/orc_tauren_escape.wav', CREEP_ESCAPE),
  'combat.creep.orc_tauren.spawn': clip('creeps/orc_tauren_spawn.wav', CREEP_SPAWN),

  'combat.tower.orc_spear_watchtower.attack': clip(
    'towers/orc_spear_watchtower_attack.wav',
    ATTACK,
  ),
  'combat.tower.orc_spear_watchtower.impact': clip(
    'towers/orc_spear_watchtower_impact.wav',
    IMPACT,
  ),
  'combat.tower.orc_burning_pit.attack': clip('towers/orc_burning_pit_attack.wav', HEAVY_ATTACK),
  'combat.tower.orc_burning_pit.impact': clip('towers/orc_burning_pit_impact.wav', IMPACT),
  'combat.tower.orc_lightning_totem.attack': clip('towers/orc_lightning_totem_attack.wav', ATTACK),
  'combat.tower.orc_lightning_totem.impact': clip('towers/orc_lightning_totem_impact.wav', IMPACT),
  'combat.tower.orc_tar_pit.attack': clip('towers/orc_tar_pit_attack.wav', ATTACK),
  'combat.tower.orc_tar_pit.impact': clip('towers/orc_tar_pit_impact.wav', IMPACT),
};
