import type { ElfSoundId } from '../../../types/sound-ids';
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

const clip = raceCombatClip.bind(null, 'elf');

export const ELF_COMBAT_SOUND_CLIPS: Record<ElfSoundId, SoundClipDefinition> = {
  'combat.attack.single.elf': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.elf': clip('attack_splash.wav', HEAVY_ATTACK),
  'combat.attack.frost.elf': clip('attack_frost.wav', ATTACK),
  'combat.attack.poison.elf': clip('attack_poison.wav', ATTACK),
  'combat.impact.elf': clip('impact.wav', IMPACT),
  'combat.build.elf': clip('build.wav', BUILD),
  'combat.creep_death.elf': clip('creep_death.wav', CREEP_DEATH),

  'combat.creep.elf_archer.hit': clip('creeps/elf_archer_hit.wav', CREEP_HIT),
  'combat.creep.elf_archer.death': clip('creeps/elf_archer_death.wav', CREEP_DEATH),
  'combat.creep.elf_archer.escape': clip('creeps/elf_archer_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_archer.spawn': clip('creeps/elf_archer_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_wisp.hit': clip('creeps/elf_wisp_hit.wav', CREEP_HIT),
  'combat.creep.elf_wisp.death': clip('creeps/elf_wisp_death.wav', CREEP_DEATH),
  'combat.creep.elf_wisp.escape': clip('creeps/elf_wisp_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_wisp.spawn': clip('creeps/elf_wisp_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_huntress.hit': clip('creeps/elf_huntress_hit.wav', CREEP_HIT),
  'combat.creep.elf_huntress.death': clip('creeps/elf_huntress_death.wav', CREEP_DEATH),
  'combat.creep.elf_huntress.escape': clip('creeps/elf_huntress_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_huntress.spawn': clip('creeps/elf_huntress_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_dryad.hit': clip('creeps/elf_dryad_hit.wav', CREEP_HIT),
  'combat.creep.elf_dryad.death': clip('creeps/elf_dryad_death.wav', CREEP_DEATH),
  'combat.creep.elf_dryad.escape': clip('creeps/elf_dryad_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_dryad.spawn': clip('creeps/elf_dryad_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_chimera.hit': clip('creeps/elf_chimera_hit.wav', CREEP_HIT),
  'combat.creep.elf_chimera.death': clip('creeps/elf_chimera_death.wav', CREEP_DEATH),
  'combat.creep.elf_chimera.escape': clip('creeps/elf_chimera_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_chimera.spawn': clip('creeps/elf_chimera_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_druid_of_the_claw.hit': clip('creeps/elf_druid_of_the_claw_hit.wav', CREEP_HIT),
  'combat.creep.elf_druid_of_the_claw.death': clip(
    'creeps/elf_druid_of_the_claw_death.wav',
    CREEP_DEATH,
  ),
  'combat.creep.elf_druid_of_the_claw.escape': clip(
    'creeps/elf_druid_of_the_claw_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.elf_druid_of_the_claw.spawn': clip(
    'creeps/elf_druid_of_the_claw_spawn.wav',
    CREEP_SPAWN,
  ),

  'combat.creep.elf_hippogryph.hit': clip('creeps/elf_hippogryph_hit.wav', CREEP_HIT),
  'combat.creep.elf_hippogryph.death': clip('creeps/elf_hippogryph_death.wav', CREEP_DEATH),
  'combat.creep.elf_hippogryph.escape': clip('creeps/elf_hippogryph_escape.wav', CREEP_ESCAPE),
  'combat.creep.elf_hippogryph.spawn': clip('creeps/elf_hippogryph_spawn.wav', CREEP_SPAWN),

  'combat.creep.elf_mountain_giant.hit': clip('creeps/elf_mountain_giant_hit.wav', CREEP_HIT),
  'combat.creep.elf_mountain_giant.death': clip('creeps/elf_mountain_giant_death.wav', CREEP_DEATH),
  'combat.creep.elf_mountain_giant.escape': clip(
    'creeps/elf_mountain_giant_escape.wav',
    CREEP_ESCAPE,
  ),
  'combat.creep.elf_mountain_giant.spawn': clip('creeps/elf_mountain_giant_spawn.wav', CREEP_SPAWN),

  'combat.tower.elf_moon_archer_tower.attack': clip(
    'towers/elf_moon_archer_tower_attack.wav',
    ATTACK,
  ),
  'combat.tower.elf_moon_archer_tower.impact': clip(
    'towers/elf_moon_archer_tower_impact.wav',
    IMPACT,
  ),
  'combat.tower.elf_wisp_bloom.attack': clip('towers/elf_wisp_bloom_attack.wav', ATTACK),
  'combat.tower.elf_wisp_bloom.impact': clip('towers/elf_wisp_bloom_impact.wav', IMPACT),
  'combat.tower.elf_moonwell.attack': clip('towers/elf_moonwell_attack.wav', ATTACK),
  'combat.tower.elf_moonwell.impact': clip('towers/elf_moonwell_impact.wav', IMPACT),
  'combat.tower.elf_thorn_spire.attack': clip('towers/elf_thorn_spire_attack.wav', ATTACK),
  'combat.tower.elf_thorn_spire.impact': clip('towers/elf_thorn_spire_impact.wav', IMPACT),
};
