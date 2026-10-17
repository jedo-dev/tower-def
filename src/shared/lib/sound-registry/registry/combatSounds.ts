import type { SoundClipGroup } from './defineClip';
import { CORE_COMBAT_SOUND_CLIPS } from './combatSounds.core';
import { ELF_COMBAT_SOUND_CLIPS } from './combatSounds.elf';
import { HUMAN_COMBAT_SOUND_CLIPS } from './combatSounds.human';
import { ORC_COMBAT_SOUND_CLIPS } from './combatSounds.orc';
import { UNDEAD_COMBAT_SOUND_CLIPS } from './combatSounds.undead';

export { CREEP_SPAWN_SOUND_COOLDOWN_MS, EFFECT_APPLY_SOUND_COOLDOWN_MS } from './combatPlayback';

/**
 * Every combat clip: the race-neutral core plus one file per race, so race
 * authors never edit the same registry file. The type requires every
 * `combat.*` id, so an id without a clip does not compile.
 */
export const COMBAT_SOUND_CLIPS: SoundClipGroup<'combat'> = {
  ...CORE_COMBAT_SOUND_CLIPS,
  ...UNDEAD_COMBAT_SOUND_CLIPS,
  ...ORC_COMBAT_SOUND_CLIPS,
  ...HUMAN_COMBAT_SOUND_CLIPS,
  ...ELF_COMBAT_SOUND_CLIPS,
};
