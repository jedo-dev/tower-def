import type { HumanSoundId } from '../../../types/sound-ids';
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

const clip = raceCombatClip.bind(null, 'human');

/** The four clips of one human creature, at `creeps/<unitId>_<slot>.wav`. */
function creature<TUnitId extends string>(unitId: TUnitId) {
  return {
    [`combat.creep.${unitId}.hit`]: clip(`creeps/${unitId}_hit.wav`, CREEP_HIT),
    [`combat.creep.${unitId}.death`]: clip(`creeps/${unitId}_death.wav`, CREEP_DEATH),
    [`combat.creep.${unitId}.escape`]: clip(`creeps/${unitId}_escape.wav`, CREEP_ESCAPE),
    [`combat.creep.${unitId}.spawn`]: clip(`creeps/${unitId}_spawn.wav`, CREEP_SPAWN),
  } as Record<
    `combat.creep.${TUnitId}.${'hit' | 'death' | 'escape' | 'spawn'}`,
    SoundClipDefinition
  >;
}

export const HUMAN_COMBAT_SOUND_CLIPS: Record<HumanSoundId, SoundClipDefinition> = {
  'combat.attack.single.human': clip('attack_single.wav', ATTACK),
  'combat.attack.splash.human': clip('attack_splash.wav', { ...HEAVY_ATTACK, volume: 0.26 }),
  'combat.attack.poison.human': clip('attack_poison.wav', ATTACK),
  'combat.impact.human': clip('impact.wav', IMPACT),
  'combat.build.human': clip('build.wav', BUILD),
  'combat.creep_death.human': clip('creep_death.wav', CREEP_DEATH),

  ...creature('human_militia'),
  ...creature('human_peasant'),
  ...creature('human_footman'),
  ...creature('human_rifleman'),
  ...creature('human_siege_engine'),
  ...creature('human_knight'),
  ...creature('human_sorceress'),
  ...creature('human_gryphon_rider'),

  'combat.tower.human_guard_archer_tower.attack': clip(
    'towers/human_guard_archer_tower_attack.wav',
    ATTACK,
  ),
  'combat.tower.human_guard_archer_tower.impact': clip(
    'towers/human_guard_archer_tower_impact.wav',
    IMPACT,
  ),
  'combat.tower.human_cannon_bastion.attack': clip('towers/human_cannon_bastion_attack.wav', {
    ...HEAVY_ATTACK,
    volume: 0.26,
  }),
  'combat.tower.human_cannon_bastion.impact': clip(
    'towers/human_cannon_bastion_impact.wav',
    IMPACT,
  ),
  'combat.tower.human_alchemist_tower.attack': clip(
    'towers/human_alchemist_tower_attack.wav',
    ATTACK,
  ),
  'combat.tower.human_alchemist_tower.impact': clip(
    'towers/human_alchemist_tower_impact.wav',
    IMPACT,
  ),
  'combat.tower.human_guard_post.attack': clip('towers/human_guard_post_attack.wav', ATTACK),
  'combat.tower.human_guard_post.impact': clip('towers/human_guard_post_impact.wav', IMPACT),
};
